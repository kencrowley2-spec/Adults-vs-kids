alter table public.arcade_timed_results
 alter column elapsed_ms drop not null,
 drop constraint timed_completion,
 add constraint qualifying_arcade_result check (
  (elapsed_ms is not null and (
  elapsed_ms >= 100 and (
   (game='maze' and score=1 and elapsed_ms<=45000) or
   (game='spot' and score=3 and elapsed_ms<=45000) or
   (game='picture' and score=3 and elapsed_ms<=30000) or
   (game='number' and score=5 and elapsed_ms<=30000)
  )))
  or (elapsed_ms is null and (
    (game='lava' and score between 1 and 630)
    or (game='claw' and score between 1 and 24)
    or (game='mole' and score between 1 and 28)
    or (game='faces' and score>=0)
    or (game='memory' and score>=12)
  ))
 );
alter table public.arcade_leaderboard alter column elapsed_ms drop not null, add column score integer;

create or replace function arcade_private.refresh_leaderboard()
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(87623542);
 delete from public.arcade_leaderboard;
 insert into public.arcade_leaderboard(game,place,user_id,family_name,elapsed_ms,score,achieved_at)
 select game,place,user_id,family_name,elapsed_ms,score,achieved_at from (
  select best.*,row_number() over(partition by game order by rank_value,achieved_at,user_id) as place
  from (
   select distinct on (r.game,r.user_id) r.game,r.user_id,
    left(coalesce(nullif(btrim(f.name),''),'Family'),60) as family_name,r.elapsed_ms,r.score,r.achieved_at,
    case when r.elapsed_ms is not null then r.elapsed_ms when r.game in ('memory','faces') then r.score else -r.score end as rank_value
   from public.arcade_timed_results r join public.families f on f.user_id=r.user_id
   order by r.game,r.user_id,rank_value,r.achieved_at,r.id
  ) best
 ) ranked where place<=100;
 insert into public.arcade_leaderboard_state(id,updated_at,next_update_at)
 values(1,now(),(date_trunc('day',now() at time zone 'UTC' - interval '5 hours')+interval '1 day 5 hours') at time zone 'UTC')
 on conflict(id) do update set updated_at=excluded.updated_at,next_update_at=excluded.next_update_at;
end;
$$;
