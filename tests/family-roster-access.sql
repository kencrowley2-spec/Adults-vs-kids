begin;
create temporary table roster_test_ids as select gen_random_uuid() as family_a,gen_random_uuid() as family_b;
grant select on roster_test_ids to authenticated,anon;
insert into auth.users(id,email,role,aud,email_confirmed_at)
select family_a,'roster-a@example.invalid','authenticated','authenticated',now() from roster_test_ids
union all select family_b,'roster-b@example.invalid','authenticated','authenticated',now() from roster_test_ids;
insert into public.families(user_id,email,name) select family_a,'roster-a@example.invalid','Roster A' from roster_test_ids on conflict do nothing;
insert into public.families(user_id,email,name) select family_b,'roster-b@example.invalid','Roster B' from roster_test_ids on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select family_a::text from roster_test_ids),true);
insert into public.family_rosters(user_id,adults,kids,playing_adults,playing_kids) select family_a,array['Parent'],array['One','Two','Three','Four','Five'],array[0],array[0,4] from roster_test_ids;
do $$ begin
 if (select cardinality(kids) from public.family_rosters)<>5 then raise exception 'Five kids not saved';end if;
 begin update public.family_rosters set kids=array['1','2','3','4','5','6'];raise exception 'Six kids accepted';exception when check_violation then null;end;
 begin update public.family_rosters set playing_kids=array[5];raise exception 'Out-of-range selection accepted';exception when check_violation then null;end;
 begin update public.family_rosters set user_id=(select family_b from roster_test_ids);raise exception 'Cross-family reassignment accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select family_b::text from roster_test_ids),true);
do $$ begin
 if exists(select 1 from public.family_rosters) then raise exception 'Other family can read roster';end if;
 begin insert into public.family_rosters(user_id) select family_a from roster_test_ids;raise exception 'Cross-family write accepted';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.family_rosters;raise exception 'Anonymous read accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: owner save, five-kid limit, valid selection indexes, family isolation, ownership protection and anonymous denial; test fixtures rolled back' as validation;
rollback;
