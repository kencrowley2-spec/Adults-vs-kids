-- Use the same friendship records for the family dashboard and Clubhouse.
create function club_private.family_search_key(label text) returns text
language sql immutable strict set search_path='' as $$
 select btrim(regexp_replace(regexp_replace(lower(btrim(label)), '^(the +)?team +|^the +', ''), ' +family$', ''))
$$;
revoke all on function club_private.family_search_key(text) from public,anon,authenticated;

create function club_private.ensure_friend_profile(family uuid) returns void
language plpgsql set search_path='' as $$
declare label text; suffix integer:=1; candidate text;
begin
 if exists(select 1 from club_private.network_profiles where owner_id=family) then return; end if;
 select left(btrim(name),60) into strict label from public.families where user_id=family;
 candidate:=label;
 loop
  insert into club_private.network_profiles(owner_id,club_name) values(family,candidate) on conflict do nothing;
  if exists(select 1 from club_private.network_profiles where owner_id=family) then return; end if;
  suffix:=suffix+1;
  candidate:=left(label,59-length(suffix::text))||' '||suffix;
 end loop;
end $$;
revoke all on function club_private.ensure_friend_profile(uuid) from public,anon,authenticated;

create function public.family_friends(p_action text,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=auth.uid(); other_id uuid; term text; normalized text; item club_private.network_connections%rowtype;
 results jsonb:='[]'; connections jsonb;
begin
 if not exists(select 1 from auth.users u join public.families f on f.user_id=u.id where u.id=me and u.email_confirmed_at is not null) then
  raise exception 'Sign in with a verified family account' using errcode='42501';
 end if;
 if p_action='search' then
  term:=lower(btrim(p_data->>'query')); normalized:=club_private.family_search_key(term);
  if term is null or length(term) not between 2 and 60 then raise exception 'Enter 2 to 60 characters'; end if;
  select coalesce(jsonb_agg(to_jsonb(matches)-'priority' order by priority,name,id),'[]') into results from (
   select f.user_id id,coalesce(p.club_name,f.name) name,coalesce(c.status,'none') status,c.id "connectionId",
    coalesce(c.recipient_id=me,false) incoming,p.owner_id is not null "clubProfile",
    case when lower(coalesce(p.club_name,f.name))=term then 0 else 1 end priority
   from public.families f join auth.users u on u.id=f.user_id
   left join club_private.network_profiles p on p.owner_id=f.user_id
   left join club_private.network_connections c on least(me,f.user_id)=least(c.requester_id,c.recipient_id)
    and greatest(me,f.user_id)=greatest(c.requester_id,c.recipient_id) and c.status in ('accepted','pending','blocked')
   where f.user_id<>me and u.email_confirmed_at is not null and c.status is distinct from 'blocked'
    and coalesce(p.club_name,f.name) not like '%@%'
    and (strpos(lower(coalesce(p.club_name,f.name)),term)>0 or
     (length(normalized)>=2 and strpos(club_private.family_search_key(coalesce(p.club_name,f.name)),normalized)>0))
   order by priority,name,id limit 20
  ) matches;
 elsif p_action='request' then
  other_id:=(p_data->>'familyId')::uuid;
  if other_id=me or not exists(select 1 from public.families f join auth.users u on u.id=f.user_id
    left join club_private.network_profiles p on p.owner_id=f.user_id
    where f.user_id=other_id and u.email_confirmed_at is not null and coalesce(p.club_name,f.name) not like '%@%') then raise exception 'That family is unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text,206));
  perform pg_advisory_xact_lock(hashtextextended(least(me,other_id)::text||greatest(me,other_id)::text,207));
  select * into item from club_private.network_connections where least(requester_id,recipient_id)=least(me,other_id)
    and greatest(requester_id,recipient_id)=greatest(me,other_id) for update;
  if item.status='blocked' then raise exception 'That family is unavailable'; end if;
  if item.status is null or item.status not in ('pending','accepted') then
   if item.updated_at>now()-interval '24 hours' then raise exception 'Please wait 24 hours before requesting again'; end if;
   if (select count(*) from club_private.network_events where actor_id=me and created_at>now()-interval '1 hour')>=60 then raise exception 'Please try again later'; end if;
   perform club_private.ensure_friend_profile(least(me,other_id));
   perform club_private.ensure_friend_profile(greatest(me,other_id));
   if item.id is null then
    insert into club_private.network_connections(requester_id,recipient_id,connection_type) values(me,other_id,'friend');
   else
    update club_private.network_connections set requester_id=me,recipient_id=other_id,connection_type='friend',status='pending',created_at=now(),updated_at=now() where id=item.id;
   end if;
   insert into club_private.network_events(actor_id,action) values(me,'request');
  end if;
 elsif p_action in ('approve','decline','remove') then
  update club_private.network_connections set status=case p_action when 'approve' then 'accepted' when 'remove' then 'removed' else 'declined' end,updated_at=now()
   where id=(p_data->>'id')::uuid and ((p_action in ('approve','decline') and recipient_id=me and status='pending')
    or (p_action='remove' and (requester_id=me and status='pending' or me in(requester_id,recipient_id) and status='accepted')));
  if not found then raise exception 'This request is no longer available'; end if;
 elsif p_action is distinct from 'read' then raise exception 'Unknown action'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',p.club_name,'status',c.status,'incoming',c.recipient_id=me) order by c.updated_at desc),'[]')
 into connections from club_private.network_connections c join club_private.network_profiles p on p.owner_id=case when c.recipient_id=me then c.requester_id else c.recipient_id end
 where me in(c.recipient_id,c.requester_id) and c.status in ('pending','accepted');
 return jsonb_build_object('results',results,'connections',connections);
end $$;
revoke all on function public.family_friends(text,jsonb) from public,anon;
grant execute on function public.family_friends(text,jsonb) to authenticated;
