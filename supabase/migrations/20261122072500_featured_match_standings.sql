create table public.featured_match_standings (
 game text not null, place integer not null check(place between 1 and 100),
 user_id uuid not null references auth.users(id) on delete cascade,
 family_name text not null, matches bigint not null check(matches>0),
 primary key(game,place), unique(game,user_id)
);
alter table public.featured_match_standings enable row level security;
revoke all on public.featured_match_standings from public,anon,authenticated;
grant select on public.featured_match_standings to authenticated;
create policy member_read on public.featured_match_standings for select to authenticated using(true);

alter function arcade_private.refresh_leaderboard() rename to refresh_performance_leaderboard;
create function arcade_private.refresh_leaderboard() returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform arcade_private.refresh_performance_leaderboard();
 delete from public.featured_match_standings;
 insert into public.featured_match_standings(game,place,user_id,family_name,matches)
 with completions as (
  select g.game,r.user_id,r.id::text as match_id,r.completed_at
  from public.arcade_results r cross join lateral unnest(r.game_ids) g(game)
  where g.game in ('lava','faces','claw','mole','memory')
  union all
  select e.detail,e.user_id,substring(e.dedupe_key from 15),e.created_at
  from public.platform_events e
  where e.event_type='game_complete' and e.detail in ('lava','faces','claw','mole','memory')
    and e.user_id is not null and e.is_internal_test is false
    and e.dedupe_key ~ '^game_complete:[0-9a-fA-F-]{36}$'
 ), distinct_matches as (
  select game,user_id,match_id,min(completed_at) as completed_at
  from completions group by game,user_id,match_id
 ), totals as (
  select game,user_id,count(*) as matches,max(completed_at) as reached
  from distinct_matches group by game,user_id
 ), ranked as (
  select t.*,left(coalesce(nullif(btrim(f.name),''),'Family'),60) as family_name,
    row_number() over(partition by game order by matches desc,reached,t.user_id) as place
  from totals t join public.families f using(user_id)
 )
 select game,place,user_id,family_name,matches from ranked where place<=100;
end;
$$;
revoke all on function arcade_private.refresh_leaderboard() from public,anon,authenticated;
select arcade_private.refresh_leaderboard();
