-- Private pre-release family network. Existing website records and policies are unchanged.
create schema club_private;
revoke all on schema club_private from public,anon;
grant usage on schema club_private to authenticated;

create table club_private.preview_administrators(
 user_id uuid primary key references auth.users(id) on delete cascade
);
-- Only the already designated website administrator can use the pre-release network.
insert into club_private.preview_administrators(user_id)
 select id from auth.users where lower(email)='kencrowley2@gmail.com' and email_confirmed_at is not null;

create table club_private.network_profiles(
 owner_id uuid primary key references public.families(user_id) on delete cascade,
 club_name text not null check(length(btrim(club_name)) between 1 and 60),
 invite_code text not null unique default upper(replace(gen_random_uuid()::text,'-','')),
 created_at timestamptz not null default now(),
 check(invite_code ~ '^[A-F0-9]{32}$')
);
create table club_private.network_connections(
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references club_private.network_profiles(owner_id) on delete cascade,
 recipient_id uuid not null references club_private.network_profiles(owner_id) on delete cascade,
 connection_type text not null check(connection_type in ('family','friend')),
 status text not null default 'pending' check(status in ('pending','accepted','declined','removed','blocked')),
 blocked_by uuid references club_private.network_profiles(owner_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(requester_id<>recipient_id),
 check((status='blocked' and blocked_by is not null and blocked_by in (requester_id,recipient_id)) or (status<>'blocked' and blocked_by is null))
);
create unique index network_connection_pair on club_private.network_connections(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create index network_connection_recipient on club_private.network_connections(recipient_id,created_at desc);
create table club_private.network_challenges(
 id uuid primary key default gen_random_uuid(),
 connection_id uuid not null references club_private.network_connections(id) on delete cascade,
 sender_id uuid not null references club_private.network_profiles(owner_id) on delete cascade,
 recipient_id uuid not null references club_private.network_profiles(owner_id) on delete cascade,
 game text not null check(game in ('balloons','trivia','dash')),
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(sender_id<>recipient_id)
);
create index network_challenge_sender on club_private.network_challenges(sender_id,created_at desc);
create index network_challenge_recipient on club_private.network_challenges(recipient_id,created_at desc);
create index network_challenge_connection on club_private.network_challenges(connection_id);
create table club_private.network_events(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id) on delete cascade,
 action text not null check(length(action)<=40),created_at timestamptz not null default now()
);
create index network_events_actor on club_private.network_events(actor_id,created_at desc);

alter table club_private.preview_administrators enable row level security;
alter table club_private.network_profiles enable row level security;
alter table club_private.network_connections enable row level security;
alter table club_private.network_challenges enable row level security;
alter table club_private.network_events enable row level security;
revoke all on all tables in schema club_private from public,anon,authenticated;
-- All mutations go through the narrow, authenticated function below, never direct table access.
create function club_private.network_action(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=auth.uid(); other_id uuid; item_id uuid; c club_private.network_connections%rowtype;
 ch club_private.network_challenges%rowtype; profile club_private.network_profiles%rowtype;
 result jsonb; v_name text; v_game text; decision text;
begin
 if me is null or not exists(select 1 from auth.users u join club_private.preview_administrators a on a.user_id=u.id where u.id=me and u.email_confirmed_at is not null) then
  raise exception 'Private club preview access required' using errcode='42501';
 end if;
 if not exists(select 1 from public.families where user_id=me) then
  raise exception 'A family administrator account is required' using errcode='42501';
 end if;
 if p_action is null or p_action not in ('read','initialize','profile','rotate_code','request','approve','decline','remove','block','unblock','challenge','accept_challenge','decline_challenge','cancel_challenge') then
  raise exception 'Unknown network action' using errcode='22023';
 end if;
 if p_action<>'read' then
  perform pg_advisory_xact_lock(hashtextextended(me::text,206));
  if (select count(*) from club_private.network_events where actor_id=me and created_at>now()-interval '1 hour')>=60 then raise exception 'Please try again later; network action limit reached' using errcode='P0001';end if;
 end if;
 if p_action='initialize' then
  insert into club_private.network_profiles(owner_id,club_name) select user_id,name from public.families where user_id=me on conflict(owner_id) do nothing;
 end if;
 select * into profile from club_private.network_profiles where owner_id=me;
 if profile.owner_id is null and p_action<>'read' then raise exception 'Set up your club family first' using errcode='22023';end if;
 if p_action='profile' then
  v_name:=btrim(p_data->>'name');
  if v_name is null or length(v_name) not between 1 and 60 then raise exception 'Use a club family name of 1 to 60 characters' using errcode='22023';end if;
  update club_private.network_profiles set club_name=v_name where owner_id=me;
 elsif p_action='rotate_code' then
  update club_private.network_profiles set invite_code=upper(replace(gen_random_uuid()::text,'-','')) where owner_id=me;
 elsif p_action='request' then
  if coalesce(p_data->>'type','') not in ('family','friend') then raise exception 'Choose family or friend' using errcode='22023';end if;
  select owner_id into other_id from club_private.network_profiles where invite_code=upper(regexp_replace(coalesce(p_data->>'code',''),'[^a-zA-Z0-9]','','g'));
  if other_id is null or other_id=me then raise exception 'Unable to send a request with that code' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me,other_id)::text||greatest(me,other_id)::text,207));
  select * into c from club_private.network_connections where least(requester_id,recipient_id)=least(me,other_id) and greatest(requester_id,recipient_id)=greatest(me,other_id) for update;
  if c.id is not null then
   if c.status in ('accepted','pending','blocked') then raise exception 'Unable to send a request with that code' using errcode='22023';end if;
   if c.updated_at>now()-interval '24 hours' then raise exception 'Please wait 24 hours before requesting this connection again' using errcode='22023';end if;
   update club_private.network_connections set requester_id=me,recipient_id=other_id,connection_type=p_data->>'type',status='pending',blocked_by=null,created_at=now(),updated_at=now() where id=c.id;
  else
   insert into club_private.network_connections(requester_id,recipient_id,connection_type) values(me,other_id,p_data->>'type');
  end if;
 elsif p_action in ('approve','decline','remove','block','unblock','challenge') then
  item_id:=(p_data->>'id')::uuid;
  select * into c from club_private.network_connections where id=item_id and me in (requester_id,recipient_id) for update;
  if c.id is null then raise exception 'Connection unavailable' using errcode='42501';end if;
  if p_action in ('approve','decline') then
   if c.recipient_id<>me or c.status<>'pending' then raise exception 'Only the receiving family administrator may respond to this request' using errcode='42501';end if;
   update club_private.network_connections set status=case when p_action='approve' then 'accepted' else 'declined' end,updated_at=now() where id=c.id;
  elsif p_action='unblock' then
   if c.status<>'blocked' or c.blocked_by<>me then raise exception 'Only the blocking administrator can unblock this connection' using errcode='42501';end if;
   update club_private.network_connections set status='removed',blocked_by=null,updated_at=now() where id=c.id;
  elsif p_action in ('remove','block') then
   if c.status='blocked' and c.blocked_by<>me then raise exception 'Connection unavailable' using errcode='42501';end if;
   update club_private.network_connections set status=case when p_action='block' then 'blocked' else 'removed' end,blocked_by=case when p_action='block' then me else null end,updated_at=now() where id=c.id;
   update club_private.network_challenges set status='cancelled',updated_at=now() where connection_id=c.id and status in ('pending','accepted');
  else
   if c.status<>'accepted' then raise exception 'Both family administrators must approve the connection before challenges' using errcode='42501';end if;
   v_game:=p_data->>'game';
   if v_game is null or v_game not in ('balloons','trivia','dash') then raise exception 'Choose a supported challenge' using errcode='22023';end if;
   if exists(select 1 from club_private.network_challenges where connection_id=c.id and status in ('pending','accepted')) then raise exception 'This connection already has an open invitation' using errcode='22023';end if;
   insert into club_private.network_challenges(connection_id,sender_id,recipient_id,game) values(c.id,me,case when c.requester_id=me then c.recipient_id else c.requester_id end,v_game);
  end if;
 elsif p_action in ('accept_challenge','decline_challenge','cancel_challenge') then
  item_id:=(p_data->>'id')::uuid;
  -- Lock the connection before its challenge, consistently with removal/block operations.
  select connection_id into other_id from club_private.network_challenges where id=item_id and me in(sender_id,recipient_id);
  select * into c from club_private.network_connections where id=other_id for update;
  select * into ch from club_private.network_challenges where id=item_id and me in(sender_id,recipient_id) for update;
  if ch.id is null or c.status<>'accepted' then raise exception 'Challenge unavailable' using errcode='42501';end if;
  if p_action='cancel_challenge' then
   if me<>ch.sender_id or ch.status not in ('pending','accepted') then raise exception 'Only the sending administrator can cancel an open invitation' using errcode='42501';end if;
   decision:='cancelled';
  else
   if me<>ch.recipient_id or ch.status<>'pending' then raise exception 'Only the receiving administrator can respond to an invitation' using errcode='42501';end if;
   decision:=case when p_action='accept_challenge' then 'accepted' else 'declined' end;
  end if;
  update club_private.network_challenges set status=decision,updated_at=now() where id=ch.id;
 end if;
 if p_action<>'read' then insert into club_private.network_events(actor_id,action) values(me,p_action);end if;
 select jsonb_build_object('name',club_name,'code',invite_code,'role','family_admin') into result from club_private.network_profiles where owner_id=me;
 return jsonb_build_object('profile',result,'connections',coalesce((
  select jsonb_agg(jsonb_build_object('id',x.id,'name',p.club_name,'type',x.connection_type,'status',x.status,'incoming',x.recipient_id=me,'blockedByMe',x.blocked_by=me,'createdAt',x.created_at) order by x.created_at desc)
  from club_private.network_connections x join club_private.network_profiles p on p.owner_id=case when x.requester_id=me then x.recipient_id else x.requester_id end
  where me in(x.requester_id,x.recipient_id) and (x.status in ('pending','accepted') or (x.status='blocked' and x.blocked_by=me))
 ),'[]'::jsonb),'challenges',coalesce((
  select jsonb_agg(jsonb_build_object('id',x.id,'name',p.club_name,'game',x.game,'status',x.status,'incoming',x.recipient_id=me,'createdAt',x.created_at) order by x.created_at desc)
  from (select * from club_private.network_challenges where me in(sender_id,recipient_id) order by created_at desc limit 50) x
  join club_private.network_profiles p on p.owner_id=case when x.sender_id=me then x.recipient_id else x.sender_id end
 ),'[]'::jsonb),'onlinePlayReady',false);
end $$;
revoke all on function club_private.network_action(text,jsonb) from public,anon,authenticated;
grant execute on function club_private.network_action(text,jsonb) to authenticated;
-- Invoker wrapper exposes only the checked action contract; private tables stay inaccessible.
create function public.club_network(p_action text default 'read',p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select club_private.network_action(p_action,p_data) $$;
revoke all on function public.club_network(text,jsonb) from public,anon,authenticated;
grant execute on function public.club_network(text,jsonb) to authenticated;
