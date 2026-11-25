-- One row per finished game, including solo and unscored play. Team wins keep their existing ledger.
create table public.arcade_plays (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 game text not null check(game=any(array['memory','tic','spot','trivia','word','tap','picture','number','challenge','maze','rps','code','golf','basketball','blocks','treasure','frog','mole','claw','lava','draw','ghostline','flex','faces','hexgl','pinball']::text[])),
 completed_at timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.arcade_plays enable row level security;
revoke all on public.arcade_plays from public,anon,authenticated;
grant select,insert(user_id,id,game) on public.arcade_plays to authenticated;
create policy plays_read_own on public.arcade_plays for select to authenticated using(user_id=(select auth.uid()));
create policy plays_insert_own on public.arcade_plays for insert to authenticated with check(user_id=(select auth.uid()));

create function public.arcade_play_id(match_id uuid,leg integer) returns uuid
language sql immutable strict set search_path='' as $$
 select (left(match_id::text,35)||to_hex((strpos('0123456789abcdef',right(match_id::text,1))-1) # leg))::uuid;
$$;
create function public.arcade_count_result() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.arcade_plays(user_id,id,game)
 select new.user_id,public.arcade_play_id(new.id,case when new.mode='series' then n::integer else 0 end),g
 from unnest(new.game_ids) with ordinality as games(g,n)
 on conflict(user_id,id) do nothing;
 return new;
end;
$$;
create trigger arcade_count_result after insert on public.arcade_results for each row execute function public.arcade_count_result();

alter table public.arcade_results drop constraint arcade_completed_result,
 add constraint arcade_completed_result check(
 public.arcade_result_valid(mode,game_ids,round_winners) or
 (mode='single' and cardinality(game_ids)=1 and game_ids[1] is not null
 and game_ids[1] in ('memory','faces','ghostline','flex','draw')
 and round_winners in (array[0]::smallint[],array[1]::smallint[])));

insert into public.arcade_plays(user_id,id,game,completed_at)
 select r.user_id,public.arcade_play_id(r.id,case when r.mode='series' then n::integer else 0 end),g,r.completed_at
 from public.arcade_results r cross join lateral unnest(r.game_ids) with ordinality as gs(g,n)
 on conflict do nothing;
insert into public.arcade_plays(user_id,id,game,completed_at)
 select e.user_id,split_part(e.dedupe_key,':',2)::uuid,e.detail,e.created_at
 from public.platform_events e where e.user_id is not null and e.event_type='game_complete'
 and e.detail=any(array['memory','tic','spot','trivia','word','tap','picture','number','challenge','maze','rps','code','golf','basketball','blocks','treasure','frog','mole','claw','lava','draw','ghostline','flex','faces','hexgl','pinball']::text[])
 and e.dedupe_key ~ '^game_complete:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 on conflict do nothing;

create or replace function public.arcade_lifetime_score() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('adults',count(*) filter(where winner=0),'kids',count(*) filter(where winner=1),
  'total',(select count(*) from public.arcade_plays where user_id=(select auth.uid())))
 from public.arcade_results where user_id=(select auth.uid());
$$;