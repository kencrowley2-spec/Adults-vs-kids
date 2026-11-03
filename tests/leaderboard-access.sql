begin;
create temporary table leaderboard_test_ids as select gen_random_uuid() as family_a,gen_random_uuid() as family_b;
grant select on leaderboard_test_ids to authenticated,anon;
insert into auth.users(id,email,role,aud,email_confirmed_at)
 select family_a,'lb-test-a@example.invalid','authenticated','authenticated',now() from leaderboard_test_ids
 union all select family_b,'lb-test-b@example.invalid','authenticated','authenticated',now() from leaderboard_test_ids;
insert into public.families(user_id,email,name)
 select family_a,'lb-test-a@example.invalid','Leaderboard Test A' from leaderboard_test_ids
 union all select family_b,'lb-test-b@example.invalid','Leaderboard Test B' from leaderboard_test_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select family_a::text from leaderboard_test_ids),true);
insert into public.arcade_timed_results(id,game,score,elapsed_ms) values(gen_random_uuid(),'maze',1,12345),(gen_random_uuid(),'maze',1,14000);
do $$ begin
 begin insert into public.arcade_timed_results(id,game,score,elapsed_ms) values(gen_random_uuid(),'picture',2,5000);raise exception 'Incomplete run accepted';exception when check_violation then null;end;
 begin insert into public.arcade_timed_results(id,user_id,game,score,elapsed_ms) select gen_random_uuid(),family_b,'maze',1,9000 from leaderboard_test_ids;raise exception 'Cross-family write accepted';exception when insufficient_privilege then null;end;
 begin update public.arcade_timed_results set elapsed_ms=100;raise exception 'Time editing accepted';exception when insufficient_privilege then null;end;
 begin insert into public.arcade_leaderboard_state values(2,now(),now());raise exception 'Snapshot editing accepted';exception when insufficient_privilege then null;end;
 begin perform arcade_private.refresh_leaderboard();raise exception 'Family can publish rankings';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select family_b::text from leaderboard_test_ids),true);
do $$ begin
 if exists(select 1 from public.arcade_timed_results) then raise exception 'Private records leaked';end if;
end $$;
insert into public.arcade_timed_results(id,game,score,elapsed_ms) values(gen_random_uuid(),'maze',1,11000);
reset role;
select arcade_private.refresh_leaderboard();
do $$ begin
 if (select count(*) from public.arcade_leaderboard where user_id in(select family_a from leaderboard_test_ids))<>1 then raise exception 'Family deduplication failed';end if;
 if (select elapsed_ms from public.arcade_leaderboard where user_id=(select family_a from leaderboard_test_ids))<>12345 then raise exception 'Best time not selected';end if;
 if (select place from public.arcade_leaderboard where user_id=(select family_b from leaderboard_test_ids)) >= (select place from public.arcade_leaderboard where user_id=(select family_a from leaderboard_test_ids)) then raise exception 'Fastest not first';end if;
 if (select next_update_at<=updated_at or next_update_at>updated_at+interval '24 hours' from public.arcade_leaderboard_state where id=1) then raise exception 'Invalid daily schedule';end if;
end $$;
-- A better record stays unpublished until the next scheduled refresh.
insert into public.arcade_timed_results(id,user_id,game,score,elapsed_ms) select gen_random_uuid(),family_a,'maze',1,10000 from leaderboard_test_ids;
do $$ begin
 if (select elapsed_ms from public.arcade_leaderboard where user_id=(select family_a from leaderboard_test_ids))<>12345 then raise exception 'Snapshot changed before refresh';end if;
end $$;
select arcade_private.refresh_leaderboard();
do $$ begin
 if (select elapsed_ms from public.arcade_leaderboard where user_id=(select family_a from leaderboard_test_ids))<>10000 then raise exception 'Refresh missed improvement';end if;
end $$;
-- More than 100 families still publishes exactly 100 rows per game.
create temporary table leaderboard_bulk as select gen_random_uuid() as id,n from generate_series(1,101) n;
insert into auth.users(id,email,role,aud,email_confirmed_at) select id,'lb-bulk-'||n||'@example.invalid','authenticated','authenticated',now() from leaderboard_bulk;
insert into public.families(user_id,email,name) select id,'lb-bulk-'||n||'@example.invalid','Leaderboard Bulk '||n from leaderboard_bulk;
insert into public.arcade_timed_results(id,user_id,game,score,elapsed_ms) select gen_random_uuid(),id,'spot',3,2000+n from leaderboard_bulk;
select arcade_private.refresh_leaderboard();
do $$ begin
 if (select count(*) from public.arcade_leaderboard where game='spot')<>100 then raise exception 'Top 100 cap failed';end if;
 if (select max(place) from public.arcade_leaderboard where game='spot')<>100 then raise exception 'Rank ordering failed';end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.arcade_leaderboard;raise exception 'Anonymous rankings accepted';exception when insufficient_privilege then null;end;
 begin perform * from public.arcade_timed_results;raise exception 'Anonymous records accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: private records, family names, completed-only times, best-per-family ranking, daily snapshot isolation and refresh, no family publishing or editing, anonymous denied' as validation;
rollback;
