-- Keep delegated search results while adding the lobby snapshot.
create or replace function club_private.network_action_v3(p_action text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); base jsonb; c club_private.network_connections%rowtype;
 txt text; v_mode text; p1 text; p2 text; target_id uuid;
begin
 -- This performs all existing authentication, verified email, owner and allowlist checks.
 base:=club_private.network_action_v2('read','{}'::jsonb);
 if p_action<>'read' then perform pg_advisory_xact_lock(hashtextextended(me::text,206));end if;
 if p_action in ('ping','message') then
  perform pg_advisory_xact_lock(hashtextextended(me::text,206));
  select * into c from club_private.network_connections where id=(p_data->>'id')::uuid and me in(requester_id,recipient_id) and status='accepted' for update;
  if c.id is null then raise exception 'Approved friend required' using errcode='42501';end if;
  if (select count(*) from club_private.network_events where actor_id=me and created_at>now()-interval '1 hour')>=60 then raise exception 'Please try again later; network action limit reached' using errcode='P0001';end if;
  if p_action='ping' and exists(select 1 from club_private.lobby_messages where connection_id=c.id and sender_id=me and kind='ping' and created_at>now()-interval '30 seconds') then raise exception 'Wait 30 seconds before pinging again' using errcode='22023';end if;
  txt:=case when p_action='ping' then 'Ready to play? Your buddy pinged you!' else btrim(coalesce(p_data->>'body','')) end;
  if length(txt) not between 1 and 500 then raise exception 'Write a message of 1 to 500 characters' using errcode='22023';end if;
  insert into club_private.lobby_messages(connection_id,sender_id,recipient_id,kind,body) values(c.id,me,case when c.requester_id=me then c.recipient_id else c.requester_id end,p_action,txt);
  insert into club_private.network_events(actor_id,action) values(me,p_action);
 elsif p_action='challenge' then
  v_mode:=coalesce(p_data->>'mode','family');p1:=btrim(coalesce(p_data->>'playerOne',''));p2:=btrim(coalesce(p_data->>'playerTwo',''));
  if v_mode not in ('friend','family') or length(p1)>60 or length(p2)>60 or (v_mode='friend' and p1='') then raise exception 'Choose a challenge type and player name' using errcode='22023';end if;
  select * into c from club_private.network_connections where id=(p_data->>'id')::uuid and me in(requester_id,recipient_id) and status='accepted' for update;
  if c.id is null then raise exception 'Approved friend required' using errcode='42501';end if;
  update club_private.network_challenges set status='cancelled',updated_at=now() where connection_id=c.id and status='pending' and expires_at<=now();
  base:=club_private.network_action_v2(p_action,p_data);
  -- The delegated action holds the connection lock and permits only one open invite.
  update club_private.network_challenges set challenge_mode=v_mode,player_one=p1,player_two='' where connection_id=(p_data->>'id')::uuid and sender_id=me and status='pending';
 elsif p_action='accept_challenge' then
  select connection_id into target_id from club_private.network_challenges where id=(p_data->>'id')::uuid and recipient_id=me;
  perform 1 from club_private.network_connections where id=target_id for update;
  if exists(select 1 from club_private.network_challenges where id=(p_data->>'id')::uuid and expires_at<=now()) then raise exception 'This invitation has expired' using errcode='22023';end if;
  p2:=btrim(coalesce(p_data->>'playerTwo',''));
  if length(p2)>60 or (p2='' and exists(select 1 from club_private.network_challenges where id=(p_data->>'id')::uuid and challenge_mode='friend')) then raise exception 'Choose your player name to accept' using errcode='22023';end if;
  base:=club_private.network_action_v2(p_action,p_data);
  update club_private.network_challenges set player_two=p2 where id=(p_data->>'id')::uuid and recipient_id=me;
 else
  base:=club_private.network_action_v2(p_action,p_data);
 end if;
 return base||jsonb_build_object('lobbyEvents',coalesce((
  select jsonb_agg(jsonb_build_object('id',m.id,'connectionId',m.connection_id,'incoming',m.recipient_id=me,'kind',m.kind,'body',m.body,'createdAt',m.created_at) order by m.created_at,m.id)
  from(select m.* from club_private.lobby_messages m join club_private.network_connections conn on conn.id=m.connection_id and conn.status='accepted'
   where me in(m.sender_id,m.recipient_id) order by m.created_at desc,m.id desc limit 200)m
 ),'[]'::jsonb),'challenges',coalesce((
  select jsonb_agg(jsonb_build_object('id',x.id,'connectionId',x.connection_id,'name',p.club_name,'game',x.game,'mode',x.challenge_mode,'playerOne',case when x.challenge_mode='family' then sender_p.club_name else x.player_one end,'playerTwo',case when x.challenge_mode='family' then recipient_p.club_name else x.player_two end,'status',case when x.status='pending' and x.expires_at<=now() then 'expired' else x.status end,'incoming',x.recipient_id=me,'createdAt',x.created_at,'expiresAt',x.expires_at) order by x.created_at desc)
  from(select * from club_private.network_challenges where me in(sender_id,recipient_id) order by created_at desc limit 50)x
  join club_private.network_profiles p on p.owner_id=case when x.sender_id=me then x.recipient_id else x.sender_id end
  join club_private.network_profiles sender_p on sender_p.owner_id=x.sender_id join club_private.network_profiles recipient_p on recipient_p.owner_id=x.recipient_id
 ),'[]'::jsonb));
end $$;
