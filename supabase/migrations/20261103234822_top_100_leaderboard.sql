-- Successful timed turns are private, append-only and account scoped.
create table public.arcade_timed_results (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 game text not null,
 score integer not null,
 elapsed_ms integer not null,
 achieved_at timestamptz not null default now(),
 constraint timed_completion check (
  elapsed_ms >= 100 and (
   (game='maze' and score=1 and elapsed_ms<=45000) or
   (game='spot' and score=3 and elapsed_ms<=45000) or
   (game='picture' and score=3 and elapsed_ms<=30000) or
   (game='number' and score=5 and elapsed_ms<=30000)
  )
 )
);
create index arcade_timed_family_game on public.arcade_timed_results(user_id,game,elapsed_ms,achieved_at);
alter table public.arcade_timed_results enable row level security;
revoke all on public.arcade_timed_results from public,anon,authenticated;
grant select on public.arcade_timed_results to authenticated;
grant insert(id,user_id,game,score,elapsed_ms) on public.arcade_timed_results to authenticated;
create policy timed_read_own on public.arcade_timed_results for select to authenticated using((select auth.uid())=user_id);
create policy timed_insert_own on public.arcade_timed_results for insert to authenticated with check((select auth.uid())=user_id);

-- Only the scheduled database owner can publish snapshots. Families read them.
create table public.arcade_leaderboard (
 game text not null,
 place integer not null check(place between 1 and 100),
 user_id uuid not null references auth.users(id) on delete cascade,
 family_name text not null,
 elapsed_ms integer not null,
 achieved_at timestamptz not null,
 primary key(game,place),
 unique(game,user_id)
);
create index arcade_leaderboard_family on public.arcade_leaderboard(user_id);
create table public.arcade_leaderboard_state (
 id integer primary key check(id=1),
 updated_at timestamptz not null,
 next_update_at timestamptz not null
);
alter table public.arcade_leaderboard enable row level security;
alter table public.arcade_leaderboard_state enable row level security;
revoke all on public.arcade_leaderboard,public.arcade_leaderboard_state from public,anon,authenticated;
grant select on public.arcade_leaderboard,public.arcade_leaderboard_state to authenticated;
create policy leaderboard_member_read on public.arcade_leaderboard for select to authenticated using(true);
create policy leaderboard_state_read on public.arcade_leaderboard_state for select to authenticated using(true);

create schema if not exists arcade_private;
revoke all on schema arcade_private from public,anon,authenticated;
create function arcade_private.refresh_leaderboard()
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(87623542);
 delete from public.arcade_leaderboard;
 insert into public.arcade_leaderboard(game,place,user_id,family_name,elapsed_ms,achieved_at)
 select game,place,user_id,family_name,elapsed_ms,achieved_at from (
  select best.*,row_number() over(partition by game order by elapsed_ms,achieved_at,user_id) as place
  from (
   select distinct on (r.game,r.user_id) r.game,r.user_id,
    left(coalesce(nullif(btrim(f.name),''),'Family'),60) as family_name,r.elapsed_ms,r.achieved_at
   from public.arcade_timed_results r join public.families f on f.user_id=r.user_id
   order by r.game,r.user_id,r.elapsed_ms,r.achieved_at,r.id
  ) best
 ) ranked where place<=100;
 insert into public.arcade_leaderboard_state(id,updated_at,next_update_at)
 values(1,now(),(date_trunc('day',now() at time zone 'UTC' - interval '5 hours')+interval '1 day 5 hours') at time zone 'UTC')
 on conflict(id) do update set updated_at=excluded.updated_at,next_update_at=excluded.next_update_at;
end;
$$;
revoke all on function arcade_private.refresh_leaderboard() from public,anon,authenticated;
-- Runs without website traffic, every 24 hours at 05:00 UTC.
create extension if not exists pg_cron;
select cron.schedule('avk-top-100-daily','0 5 * * *','select arcade_private.refresh_leaderboard()');
select arcade_private.refresh_leaderboard();
