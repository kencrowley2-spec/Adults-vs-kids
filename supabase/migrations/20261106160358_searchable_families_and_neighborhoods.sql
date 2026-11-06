-- Simplify the private network: searchable club names and administrator-approved neighborhoods.
create unique index network_profile_unique_club_name on club_private.network_profiles(lower(btrim(club_name)));
create index network_connection_requester on club_private.network_connections(requester_id,created_at desc);
create index network_connection_blocked_by on club_private.network_connections(blocked_by);
create table club_private.neighborhoods(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references club_private.network_profiles(owner_id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 60),archived boolean not null default false,created_at timestamptz not null default now()
);
create index neighborhood_owner on club_private.neighborhoods(owner_id,created_at desc);
create table club_private.neighborhood_members(
 neighborhood_id uuid not null references club_private.neighborhoods(id) on delete cascade,
 family_id uuid not null references club_private.network_profiles(owner_id) on delete cascade,
 invited_by uuid not null references club_private.network_profiles(owner_id),
 status text not null check(status in ('pending','accepted','declined','left','removed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(neighborhood_id,family_id)
);
create index neighborhood_member_family on club_private.neighborhood_members(family_id,created_at desc);
create index neighborhood_member_inviter on club_private.neighborhood_members(invited_by);
alter table club_private.neighborhoods enable row level security;
alter table club_private.neighborhood_members enable row level security;
revoke all on club_private.neighborhoods,club_private.neighborhood_members from public,anon,authenticated;

create function club_private.network_action_v2(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=auth.uid(); base jsonb; groups jsonb; results jsonb:='[]'::jsonb; query_text text; other_id uuid;
 group_id uuid; group_row club_private.neighborhoods%rowtype; member_row club_private.neighborhood_members%rowtype;
 my_profile club_private.network_profiles%rowtype; chosen_name text;
begin
 -- Reuse the verified account-owner and pre-release checks, with no mutation.
 base:=club_private.network_action('read','{}'::jsonb);
 if p_action is null or p_action not in ('read','initialize','profile','search','request','approve','decline','remove','block','unblock','challenge','accept_challenge','decline_challenge','cancel_challenge','create_neighborhood','invite_neighbor','accept_neighborhood','decline_neighborhood','leave_neighborhood','remove_neighbor','archive_neighborhood') then
  raise exception 'Unknown network action' using errcode='22023';
 end if;
 if p_action='read' then null;
 elsif p_action in ('profile','approve','decline','remove','block','unblock','challenge','accept_challenge','decline_challenge','cancel_challenge') then
  base:=club_private.network_action(p_action,p_data);
  if p_action='block' then
   select case when requester_id=me then recipient_id else requester_id end into other_id from club_private.network_connections where id=(p_data->>'id')::uuid and me in(requester_id,recipient_id);
   update club_private.neighborhood_members m set status='removed',updated_at=now()
   from club_private.neighborhoods g where g.id=m.neighborhood_id and m.status='pending' and ((g.owner_id=me and m.family_id=other_id) or (g.owner_id=other_id and m.family_id=me));
  end if;
 elsif p_action='request' then
  other_id:=(p_data->>'familyId')::uuid;
  if other_id is null or other_id=me then raise exception 'Select a family from the search results' using errcode='22023';end if;
  select invite_code into chosen_name from club_private.network_profiles where owner_id=other_id;
  if chosen_name is null then raise exception 'That family is unavailable' using errcode='22023';end if;
  -- The old secret remains internal only; callers can no longer submit or retrieve codes.
  base:=club_private.network_action('request',jsonb_build_object('code',chosen_name,'type',coalesce(p_data->>'type','friend')));
 else
  perform pg_advisory_xact_lock(hashtextextended(me::text,206));
  if (select count(*) from club_private.network_events where actor_id=me and created_at>now()-interval '1 hour')>=60 then raise exception 'Please try again later; network action limit reached' using errcode='P0001';end if;
  if p_action='initialize' then
   chosen_name:=btrim(coalesce(p_data->>'name',(select name from public.families where user_id=me)));
   if chosen_name is null or length(chosen_name) not between 1 and 60 then raise exception 'Use a club family name of 1 to 60 characters' using errcode='22023';end if;
   insert into club_private.network_profiles(owner_id,club_name) values(me,chosen_name) on conflict(owner_id) do nothing;
  end if;
  select * into my_profile from club_private.network_profiles where owner_id=me;
  if my_profile.owner_id is null then raise exception 'Set up your club family first' using errcode='22023';end if;
  if p_action='search' then
   query_text:=btrim(coalesce(p_data->>'query',''));
   if length(query_text) not between 2 and 60 then raise exception 'Enter at least 2 letters of a family name' using errcode='22023';end if;
   select coalesce(jsonb_agg(jsonb_build_object('id',p.owner_id,'name',p.club_name,'status',coalesce(c.status,'none'),'incoming',coalesce(c.recipient_id=me,false),'connectionId',c.id) order by p.club_name,p.owner_id),'[]'::jsonb) into results
   from (select * from club_private.network_profiles n where n.owner_id<>me and strpos(lower(n.club_name),lower(query_text))>0
    and not exists(select 1 from club_private.network_connections b where me in(b.requester_id,b.recipient_id) and n.owner_id in(b.requester_id,b.recipient_id) and b.status='blocked')
    order by n.club_name,n.owner_id limit 20) p
   left join club_private.network_connections c on least(c.requester_id,c.recipient_id)=least(me,p.owner_id) and greatest(c.requester_id,c.recipient_id)=greatest(me,p.owner_id) and c.status in ('pending','accepted');
  elsif p_action='create_neighborhood' then
   chosen_name:=btrim(coalesce(p_data->>'name',''));
   if length(chosen_name) not between 1 and 60 then raise exception 'Give your neighborhood a name of 1 to 60 characters' using errcode='22023';end if;
   if (select count(*) from club_private.neighborhoods where owner_id=me and not archived)>=5 then raise exception 'You can manage up to 5 neighborhoods' using errcode='22023';end if;
   insert into club_private.neighborhoods(owner_id,name) values(me,chosen_name) returning id into group_id;
   insert into club_private.neighborhood_members(neighborhood_id,family_id,invited_by,status) values(group_id,me,me,'accepted');
  elsif p_action in ('invite_neighbor','remove_neighbor','archive_neighborhood') then
   group_id:=(p_data->>'neighborhoodId')::uuid;
   select * into group_row from club_private.neighborhoods where id=group_id and owner_id=me and not archived for update;
   if group_row.id is null then raise exception 'Only the neighborhood administrator can manage this group' using errcode='42501';end if;
   if p_action='archive_neighborhood' then
    update club_private.neighborhoods set archived=true where id=group_id;
    update club_private.neighborhood_members set status='removed',updated_at=now() where neighborhood_id=group_id and family_id<>me and status in ('pending','accepted');
   else
    other_id:=(p_data->>'familyId')::uuid;
    if other_id is null or other_id=me or not exists(select 1 from club_private.network_profiles where owner_id=other_id) then raise exception 'Select a family to invite' using errcode='22023';end if;
    if p_action='remove_neighbor' then
     update club_private.neighborhood_members set status='removed',updated_at=now() where neighborhood_id=group_id and family_id=other_id and status in ('pending','accepted');
     if not found then raise exception 'That member is unavailable' using errcode='22023';end if;
    else
     -- Serialize with blocking and friend-request operations for this pair.
     perform pg_advisory_xact_lock(hashtextextended(least(me,other_id)::text||greatest(me,other_id)::text,207));
     perform 1 from club_private.network_connections where least(requester_id,recipient_id)=least(me,other_id) and greatest(requester_id,recipient_id)=greatest(me,other_id) for update;
     if exists(select 1 from club_private.network_connections where least(requester_id,recipient_id)=least(me,other_id) and greatest(requester_id,recipient_id)=greatest(me,other_id) and status='blocked') then raise exception 'That family is unavailable' using errcode='22023';end if;
     if (select count(*) from club_private.neighborhood_members where neighborhood_id=group_id and status in ('pending','accepted'))>=50 then raise exception 'A neighborhood can have up to 50 families' using errcode='22023';end if;
     select * into member_row from club_private.neighborhood_members where neighborhood_id=group_id and family_id=other_id for update;
     if member_row.status in ('pending','accepted') then raise exception 'That family is already invited or a member' using errcode='22023';end if;
     if member_row.updated_at>now()-interval '24 hours' then raise exception 'Please wait 24 hours before inviting this family again' using errcode='22023';end if;
     insert into club_private.neighborhood_members(neighborhood_id,family_id,invited_by,status) values(group_id,other_id,me,'pending')
      on conflict(neighborhood_id,family_id) do update set invited_by=me,status='pending',created_at=now(),updated_at=now();
    end if;
   end if;
  elsif p_action in ('accept_neighborhood','decline_neighborhood','leave_neighborhood') then
   group_id:=(p_data->>'neighborhoodId')::uuid;
   select * into group_row from club_private.neighborhoods where id=group_id and not archived for update;
   if group_row.id is not null then
    perform pg_advisory_xact_lock(hashtextextended(least(me,group_row.owner_id)::text||greatest(me,group_row.owner_id)::text,207));
    perform 1 from club_private.network_connections where least(requester_id,recipient_id)=least(me,group_row.owner_id) and greatest(requester_id,recipient_id)=greatest(me,group_row.owner_id) for update;
   end if;
   select * into member_row from club_private.neighborhood_members where neighborhood_id=group_id and family_id=me for update;
   if group_row.id is null or member_row.family_id is null or group_row.owner_id=me then raise exception 'Neighborhood invitation unavailable' using errcode='42501';end if;
   if p_action='leave_neighborhood' then
    if member_row.status<>'accepted' then raise exception 'Neighborhood membership unavailable' using errcode='42501';end if;
    update club_private.neighborhood_members set status='left',updated_at=now() where neighborhood_id=group_id and family_id=me;
   else
    if member_row.status<>'pending' then raise exception 'Only the invited family administrator can respond' using errcode='42501';end if;
    if p_action='accept_neighborhood' and exists(select 1 from club_private.network_connections where least(requester_id,recipient_id)=least(me,group_row.owner_id) and greatest(requester_id,recipient_id)=greatest(me,group_row.owner_id) and status='blocked') then raise exception 'Neighborhood invitation unavailable' using errcode='42501';end if;
    update club_private.neighborhood_members set status=case when p_action='accept_neighborhood' then 'accepted' else 'declined' end,updated_at=now() where neighborhood_id=group_id and family_id=me;
   end if;
  end if;
  insert into club_private.network_events(actor_id,action) values(me,p_action);
  base:=club_private.network_action('read','{}'::jsonb);
 end if;
 -- Omit legacy codes from every response, including delegated actions.
 if base->'profile'<>'null'::jsonb then base:=jsonb_set(base,'{profile}',(base->'profile')-'code');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'isOwner',g.owner_id=me,'status',my.status,'ownerName',owner_p.club_name,
 'memberCount',(select count(*) from club_private.neighborhood_members n where n.neighborhood_id=g.id and n.status='accepted'),
 'members',case when my.status='accepted' then coalesce((select jsonb_agg(jsonb_build_object('id',p.owner_id,'name',p.club_name,'status',n.status,'isOwner',p.owner_id=g.owner_id,'isMe',p.owner_id=me) order by p.club_name,p.owner_id)
   from club_private.neighborhood_members n join club_private.network_profiles p on p.owner_id=n.family_id
   where n.neighborhood_id=g.id and (n.status='accepted' or (g.owner_id=me and n.status='pending'))),'[]'::jsonb) else '[]'::jsonb end) order by g.created_at desc),'[]'::jsonb) into groups
 from club_private.neighborhoods g join club_private.neighborhood_members my on my.neighborhood_id=g.id and my.family_id=me and my.status in ('pending','accepted')
 join club_private.network_profiles owner_p on owner_p.owner_id=g.owner_id where not g.archived;
 return base||jsonb_build_object('neighborhoods',groups,'results',results);
end $$;
revoke all on function club_private.network_action_v2(text,jsonb) from public,anon,authenticated;
grant execute on function club_private.network_action_v2(text,jsonb) to authenticated;
revoke all on function club_private.network_action(text,jsonb) from public,anon,authenticated;
create or replace function public.club_network(p_action text default 'read',p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select club_private.network_action_v2(p_action,p_data) $$;
revoke all on function public.club_network(text,jsonb) from public,anon,authenticated;
grant execute on function public.club_network(text,jsonb) to authenticated;
