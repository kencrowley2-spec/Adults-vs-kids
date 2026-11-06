begin;
create temporary table network_test_ids as select gen_random_uuid() a,gen_random_uuid() b,gen_random_uuid() c,gen_random_uuid() outsider, null::text code_a,null::text code_b,null::uuid connection_id,null::uuid challenge_id;
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
 r:=public.club_network('initialize');update network_test_ids set code_a=r->'profile'->>'code';
 begin perform * from club_private.network_profiles;raise exception 'Direct private-table read accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
update network_test_ids set code_b=public.club_network('initialize')->'profile'->>'code';
select set_config('request.jwt.claim.sub',(select c::text from network_test_ids),true);
select public.club_network('initialize')->'profile'->>'role' as c_role;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare r jsonb; cid uuid; begin
 r:=public.club_network('request',jsonb_build_object('code',(select code_b from network_test_ids),'type','friend'));
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
do $$ declare r jsonb; begin
 r:=public.club_network('accept_challenge',jsonb_build_object('id',(select challenge_id from network_test_ids)));
 if r->'challenges'->0->>'status'<>'accepted' then raise exception 'Challenge acceptance failed';end if;
 r:=public.club_network('block',jsonb_build_object('id',(select connection_id from network_test_ids)));
 if r->'challenges'->0->>'status'<>'cancelled' then raise exception 'Blocking failed to cancel challenge';end if;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from network_test_ids),true);
do $$ declare old_code text; r jsonb; begin
 if jsonb_array_length(public.club_network('read')->'connections')<>0 then raise exception 'Blocked family sees blocking control';end if;
 begin perform public.club_network('unblock',jsonb_build_object('id',(select connection_id from network_test_ids)));raise exception 'Blocked family unblocked itself';exception when insufficient_privilege then null;end;
 begin perform public.club_network('request',jsonb_build_object('code',(select code_b from network_test_ids),'type','family'));raise exception 'Blocked family re-requested';exception when invalid_parameter_value then null;end;
 old_code:=(select code_a from network_test_ids);r:=public.club_network('rotate_code');if r->'profile'->>'code'=old_code then raise exception 'Code did not rotate';end if;
end $$;
select set_config('request.jwt.claim.sub',(select b::text from network_test_ids),true);
do $$ begin
 perform public.club_network('unblock',jsonb_build_object('id',(select connection_id from network_test_ids)));
 if jsonb_array_length(public.club_network('read')->'connections')<>0 then raise exception 'Unblock automatically reconnected';end if;
 begin perform public.club_network('request',jsonb_build_object('code',(select code_a from network_test_ids),'type','family'));raise exception 'Rotated-out code accepted';exception when invalid_parameter_value then null;end;
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
select 'PASS: family-owner gate, preview isolation, private table denial, bilateral approval, third-family isolation, challenge permissions, block/cancel, unblock, code rotation and anonymous denial. All fixtures rolled back.' as validation;
rollback;
