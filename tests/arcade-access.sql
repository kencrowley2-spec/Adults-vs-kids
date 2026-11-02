begin;
create temporary table arcade_test_ids as select gen_random_uuid() as family_a,gen_random_uuid() as family_b,gen_random_uuid() as match_id;
grant select on arcade_test_ids to authenticated,anon;
insert into auth.users(id,email,role,aud,email_confirmed_at)
 select family_a,'arcade-test-a@example.invalid','authenticated','authenticated',now() from arcade_test_ids
 union all select family_b,'arcade-test-b@example.invalid','authenticated','authenticated',now() from arcade_test_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select family_a::text from arcade_test_ids),true);
insert into public.arcade_results(id,mode,game_ids,round_winners)
 select match_id,'single',array['memory'],array[0,1,0,1,0]::smallint[] from arcade_test_ids;
-- Retrying the same completed match must be a no-op.
insert into public.arcade_results(id,mode,game_ids,round_winners)
 select match_id,'single',array['memory'],array[0,1,0,1,0]::smallint[] from arcade_test_ids on conflict(id) do nothing;
do $$ begin
 if public.arcade_lifetime_score()<> '{"adults":1,"kids":0,"total":1}'::jsonb then raise exception 'Owner total incorrect';end if;
 begin
  insert into public.arcade_results(id,mode,game_ids,round_winners) values(gen_random_uuid(),'single',array['tic'],array[0,0]::smallint[]);
  raise exception 'Incomplete match accepted';
 exception when check_violation then null;end;
 begin
  insert into public.arcade_results(id,mode,game_ids,round_winners) values(gen_random_uuid(),'series',array['maze','maze','golf'],array[0,1,0]::smallint[]);
  raise exception 'Duplicate-game series accepted';
 exception when check_violation then null;end;
 begin
  insert into public.arcade_results(id,user_id,mode,game_ids,round_winners) select gen_random_uuid(),family_b,'single',array['tic'],array[1,1,1]::smallint[] from arcade_test_ids;
  raise exception 'Cross-family insert accepted';
 exception when insufficient_privilege then null;end;
 begin
  update public.arcade_results set mode='series';raise exception 'Result mutation accepted';
 exception when insufficient_privilege then null;end;
 begin
  delete from public.arcade_results;raise exception 'Result deletion accepted';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',(select family_b::text from arcade_test_ids),true);
do $$ begin
 if exists(select 1 from public.arcade_results) then raise exception 'Other family can read result';end if;
 if public.arcade_lifetime_score()<>'{"adults":0,"kids":0,"total":0}'::jsonb then raise exception 'Other family totals leaked';end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.arcade_results;raise exception 'Anonymous access accepted';exception when insufficient_privilege then null;end;
 begin perform public.arcade_lifetime_score();raise exception 'Anonymous totals accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: real database totals, immutable results, incomplete-match rejection, deduplication, family isolation, anonymous access denied; all fixtures rolled back' as validation;
rollback;
