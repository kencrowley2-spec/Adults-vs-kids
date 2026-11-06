begin;
create temporary table dashboard_test_ids as select gen_random_uuid() as family_a,gen_random_uuid() as family_b;
grant select on dashboard_test_ids to authenticated,anon;
insert into auth.users(id,email,role,aud,email_confirmed_at)
select family_a,'dashboard-a@example.invalid','authenticated','authenticated',now() from dashboard_test_ids
union all select family_b,'dashboard-b@example.invalid','authenticated','authenticated',now() from dashboard_test_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select family_a::text from dashboard_test_ids),true);
insert into public.club_dashboard_profiles(user_id,profile_key,display_name,scene) select family_a,'account','Captain A','alpine' from dashboard_test_ids;
do $$ begin
 if (select count(*) from public.club_dashboard_profiles)<>1 then raise exception 'Own profile unavailable';end if;
 update public.club_dashboard_profiles set scene='coast' where profile_key='account';
 begin update public.club_dashboard_profiles set user_id=(select family_b from dashboard_test_ids);raise exception 'Profile reassignment accepted';exception when insufficient_privilege then null;end;
 begin update public.club_dashboard_profiles set headshot='data:image/svg+xml;base64,PHN2Zz4=';raise exception 'SVG accepted';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select family_b::text from dashboard_test_ids),true);
do $$ begin
 if exists(select 1 from public.club_dashboard_profiles) then raise exception 'Other family can read personal photos';end if;
 begin insert into public.club_dashboard_profiles(user_id,profile_key,display_name) select family_a,'account','Intruder' from dashboard_test_ids;raise exception 'Cross-family write accepted';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.club_dashboard_profiles;raise exception 'Anonymous photo read accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: own-profile read and update, no cross-family reads or writes, ownership cannot change, SVG rejected and anonymous access denied; fixtures rolled back' as validation;
rollback;
