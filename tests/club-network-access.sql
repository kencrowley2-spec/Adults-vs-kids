begin;
create temporary table network_test_ids as select gen_random_uuid() a,gen_random_uuid() b,gen_random_uuid() c,gen_random_uuid() outsider, null::text code_a,null::text code_b,null::uuid connection_id,null::uuid challenge_id,null::uuid neighborhood_id;
grant select,update on network_test_ids to authenticated;
insert into auth.users(id,email,role,aud,email_confirmed_at,raw_user_meta_data)
select x.id,'network-'||x.label||'@example.invalid','authenticated','authenticated',now(),'{"role":"family_admin"}'::jsonb
from network_test_ids t cross join lateral(values(t.a,'a'),(t.b,'b'),(t.c,'c'),(t.outsider,'outsider'))x(id,label);
insert into public.families(user_id,email,name)
select x.id,'network-'||x.label||'@example.invalid','Network test '||x.label
from network_test_ids t cross join lateral(values(t.a,'a'),(t.b,'b'),(t.c,'c'),(t.outsider,'outsider'))x(id,label) on conflict(user_id) do nothing;
insert into club_private.preview_administrators(user_id) select a from network_test_ids union all select b from network_test_ids union all select c from network_test_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; begin
 r:=public.club_network('read');if r->'profile'<>'null'::jsonb then raise exception 'Uninitialized family unexpectedly provisioned';end if;
 r:=public.club_network('initialize');if (r->'profile') ? 'code' then raise exception 'Legacy code exposed';end if;
 begin perform * from club_private.network_profiles;raise exception 'Direct private-table read accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
select public.club_network('initialize')->'profile'->>'role' as b_role;
select set_config('request.jwt.claim.sub',(select c::text from network_test_ids),true);
select public.club_network('initialize')->'profile'->>'role' as c_role;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; cid uuid; begin
 r:=public.club_network('request',jsonb_build_object('familyId',(select b from network_test_ids),'type','friend'));
 cid:=(r->'connections'->0->>'id')::uuid;update network_test_ids set connection_id=cid;
 if r->'connections'->0->>'status'<>'pending' then raise exception 'Requests must be pending';end if;
 if (r->'connections'->0) ? 'code' or (r->'connections'->0) ? 'email' then raise exception 'Private contact data exposed';end if;
 begin perform public.club_network('approve',jsonb_build_object('id',cid));raise exception 'Sender approved own request';exception when insufficient_privilege then null;end;
 begin perform public.club_network('challenge',jsonb_build_object('id',cid,'game','balloons'));raise exception 'Pending connection challenged';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select c::text from network_test_ids),true);
do $$ begin
 if jsonb_array_length(public.club_network('read')->'connections')<>0 then raise exception 'Third family can see private connections';end if;
 begin perform public.club_network('approve',jsonb_build_object('id',(select connection_id from network_test_ids)));raise exception 'Third family approved request';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
do $$ declare r jsonb; begin
 r:=public.club_network('approve',jsonb_build_object('id',(select connection_id from network_test_ids)));
 if r->'connections'->0->>'status'<>'accepted' then raise exception 'Recipient approval failed';end if;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; begin
 r:=public.club_network('challenge',jsonb_build_object('id',(select connection_id from network_test_ids),'game','trivia'));
 update network_test_ids set challenge_id=(r->'challenges'->0->>'id')::uuid;
 if r->>'onlinePlayReady'<>'false' then raise exception 'Unimplemented online play marked ready';end if;
 begin perform public.club_network('accept_challenge',jsonb_build_object('id',(select challenge_id from network_test_ids)));raise exception 'Sender accepted own invitation';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select c::text from network_test_ids),true);
do $$ begin
 if jsonb_array_length(public.club_network('read')->'challenges')<>0 then raise exception 'Third family sees invitations';end if;
 begin perform public.club_network('accept_challenge',jsonb_build_object('id',(select challenge_id from network_test_ids)));raise exception 'Third family accepted invitation';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
do $$ declare r jsonb; chosen_challenge uuid; begin
 r:=public.club_network('accept_challenge',jsonb_build_object('id',(select challenge_id from network_test_ids)));
 if r->'challenges'->0->>'status'<>'accepted' then raise exception 'Challenge acceptance failed';end if;

 perform public.club_network('message',jsonb_build_object('id',(select connection_id from network_test_ids),'body','Lobby test message'));
 r:=public.club_network('ping',jsonb_build_object('id',(select connection_id from network_test_ids)));
 if jsonb_array_length(r->'lobbyEvents')<>2 then raise exception 'Lobby delivery failed';end if;
 begin perform public.club_network('ping',jsonb_build_object('id',(select connection_id from network_test_ids)));raise exception 'Duplicate ping allowed';exception when invalid_parameter_value then null;end;
 begin perform public.club_network('message',jsonb_build_object('id',(select connection_id from network_test_ids),'body',repeat('x',501)));raise exception 'Oversize message allowed';exception when invalid_parameter_value then null;end;
 begin perform * from club_private.lobby_messages;raise exception 'Direct message access allowed';exception when insufficient_privilege then null;end;

 perform set_config('request.jwt.claim.sub',(select c::text from network_test_ids),true);
 if jsonb_array_length(public.club_network('read')->'lobbyEvents')<>0 then raise exception 'Third family read messages';end if;
 begin perform public.club_network('message',jsonb_build_object('id',(select connection_id from network_test_ids),'body','Intruder'));raise exception 'Third family messaged';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
 perform public.club_network('cancel_challenge',jsonb_build_object('id',(select challenge_id from network_test_ids)));
 r:=public.club_network('challenge',jsonb_build_object('id',(select connection_id from network_test_ids),'game','dash','mode','friend','playerOne','Ken'));
 select (x->>'id')::uuid into strict chosen_challenge from jsonb_array_elements(r->'challenges')x where x->>'status'='pending';
 update network_test_ids set challenge_id=chosen_challenge;
 perform set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
 begin perform public.club_network('accept_challenge',jsonb_build_object('id',(select challenge_id from network_test_ids)));raise exception 'Nameless player accepted';exception when invalid_parameter_value then null;end;
 r:=public.club_network('accept_challenge',jsonb_build_object('id',(select challenge_id from network_test_ids),'playerTwo','Harper'));
 if not exists(select 1 from jsonb_array_elements(r->'challenges')x where x->>'playerOne'='Ken' and x->>'playerTwo'='Harper' and x->>'mode'='friend' and x->>'status'='accepted') then raise exception 'Friend matchup names failed';end if;
 r:=public.club_network('block',jsonb_build_object('id',(select connection_id from network_test_ids)));
 if exists(select 1 from jsonb_array_elements(r->'challenges')x where x->>'status' in ('pending','accepted')) then raise exception 'Blocking failed to cancel challenge';end if;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare old_code text; r jsonb; begin
 if jsonb_array_length(public.club_network('read')->'connections')<>0 then raise exception 'Blocked family sees blocking control';end if;
 if jsonb_array_length(public.club_network('read')->'lobbyEvents')<>0 then raise exception 'Blocked message access allowed';end if;
 begin perform public.club_network('message',jsonb_build_object('id',(select connection_id from network_test_ids),'body','Blocked message'));raise exception 'Blocked sender messaged';exception when insufficient_privilege then null;end;
 begin perform public.club_network('unblock',jsonb_build_object('id',(select connection_id from network_test_ids)));raise exception 'Blocked family unblocked itself';exception when insufficient_privilege then null;end;
 begin perform public.club_network('request',jsonb_build_object('familyId',(select b from network_test_ids),'type','family'));raise exception 'Blocked family re-requested';exception when invalid_parameter_value then null;end;
 begin perform public.club_network('rotate_code');raise exception 'Legacy code action accepted';exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
do $$ begin
 perform public.club_network('unblock',jsonb_build_object('id',(select connection_id from network_test_ids)));
 if jsonb_array_length(public.club_network('read')->'connections')<>0 then raise exception 'Unblock automatically reconnected';end if;
 begin perform public.club_network('request',jsonb_build_object('code','DEPRECATED','type','family'));raise exception 'Legacy code request accepted';exception when invalid_parameter_value then null;end;
end $$;

select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; begin
 r:=public.club_network('search',jsonb_build_object('query','Network test'));
 if jsonb_array_length(r->'results')<>2 then raise exception 'Family search incorrect';end if;
 if (r->'results'->0) ? 'email' or (r->'results'->0) ? 'code' then raise exception 'Search leaked private information';end if;
 begin perform club_private.network_action('read');raise exception 'Old code-based helper directly accessible';exception when insufficient_privilege then null;end;
 begin perform public.club_network('profile',jsonb_build_object('name','Network test b'));raise exception 'Duplicate searchable family name accepted';exception when unique_violation then null;end;
 r:=public.club_network('create_neighborhood',jsonb_build_object('name','Friday Night Families'));
 update network_test_ids set neighborhood_id=(r->'neighborhoods'->0->>'id')::uuid;
 if r->'neighborhoods'->0->>'memberCount'<>'1' then raise exception 'Neighborhood owner not joined';end if;
 perform public.club_network('invite_neighbor',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids),'familyId',(select c from network_test_ids)));
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
do $$ begin
 if jsonb_array_length(public.club_network('read')->'neighborhoods')<>0 then raise exception 'Uninvited family sees Neighborhood';end if;
 begin perform public.club_network('accept_neighborhood',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids)));raise exception 'Uninvited family joined';exception when insufficient_privilege then null;end;
 begin perform public.club_network('invite_neighbor',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids),'familyId',(select b from network_test_ids)));raise exception 'Non-owner sent invitation';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select c::text from network_test_ids),true);
do $$ declare r jsonb; begin
 r:=public.club_network('read');if r->'neighborhoods'->0->>'status'<>'pending' then raise exception 'Invitation skipped administrator approval';end if;
 if jsonb_array_length(r->'neighborhoods'->0->'members')<>0 then raise exception 'Pending invite exposes member list';end if;
 r:=public.club_network('accept_neighborhood',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids)));
 if r->'neighborhoods'->0->>'memberCount'<>'2' then raise exception 'Acceptance failed to join';end if;
 begin perform public.club_network('invite_neighbor',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids),'familyId',(select b from network_test_ids)));raise exception 'Member managed invitations';exception when insufficient_privilege then null;end;
 perform public.club_network('leave_neighborhood',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids)));
 if jsonb_array_length(public.club_network('read')->'neighborhoods')<>0 then raise exception 'Left family retains group access';end if;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; begin
 perform public.club_network('invite_neighbor',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids),'familyId',(select b from network_test_ids)));
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
select public.club_network('decline_neighborhood',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids)))->'neighborhoods' as declined_groups;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; begin
 r:=public.club_network('read');if r->'neighborhoods'->0->>'memberCount'<>'1' then raise exception 'Decline/leave failed';end if;
 perform public.club_network('archive_neighborhood',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids)));
 if jsonb_array_length(public.club_network('read')->'neighborhoods')<>0 then raise exception 'Archived Neighborhood remains active';end if;
end $$;

select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; begin
 r:=public.club_network('create_neighborhood',jsonb_build_object('name','Block cancellation test'));
 update network_test_ids set neighborhood_id=(r->'neighborhoods'->0->>'id')::uuid;
 perform public.club_network('invite_neighbor',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids),'familyId',(select b from network_test_ids)));
 perform public.club_network('block',jsonb_build_object('id',(select connection_id from network_test_ids)));
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
do $$ begin
 if jsonb_array_length(public.club_network('read')->'neighborhoods')<>0 then raise exception 'Blocked invitation remained visible';end if;
 begin perform public.club_network('accept_neighborhood',jsonb_build_object('neighborhoodId',(select neighborhood_id from network_test_ids)));raise exception 'Blocked family joined Neighborhood';exception when insufficient_privilege then null;end;
 if jsonb_array_length(public.club_network('search',jsonb_build_object('query','Network test a'))->'results')<>0 then raise exception 'Blocked family remained searchable';end if;
end $$;
select set_config('request.jwt.claim.sub',(select outsider::text from network_test_ids),true);
do $$ begin
 begin perform public.club_network('initialize');raise exception 'Normal account or editable role bypassed preview gate';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform public.club_network('read');raise exception 'Anonymous RPC accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: family-owner gate, preview isolation, private table denial, bilateral approval, third-family isolation, challenge permissions, block/cancel, unblock, family-name search, code removal, unique names, Neighborhood ownership, invitations, acceptance, privacy, leaving, closing and anonymous denial. All fixtures rolled back.' as validation;
rollback;
