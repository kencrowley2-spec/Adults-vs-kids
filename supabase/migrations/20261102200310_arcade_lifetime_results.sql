-- Completed play is an append-only ledger. Lifetime totals are derived, never edited.
create function public.arcade_result_valid(p_mode text,p_games text[],p_rounds smallint[])
returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(
  p_mode in ('single','series')
  and array_position(p_games,null) is null and array_position(p_rounds,null) is null
  and p_games <@ array['memory','tic','spot','trivia','word','tap','picture','number','challenge','maze','rps','code','golf']::text[]
  and p_rounds <@ array[0,1]::smallint[]
  and case when p_mode='series' then
   cardinality(p_games)=3 and cardinality(p_rounds)=3
   and p_games[1]<>p_games[2] and p_games[1]<>p_games[3] and p_games[2]<>p_games[3]
  else
   cardinality(p_games)=1 and cardinality(p_rounds) between 3 and 5
   and greatest(cardinality(array_positions(p_rounds,0::smallint)),cardinality(array_positions(p_rounds,1::smallint)))=3
   and cardinality(array_positions(p_rounds[1:cardinality(p_rounds)-1],0::smallint))<3
   and cardinality(array_positions(p_rounds[1:cardinality(p_rounds)-1],1::smallint))<3
  end,false);
$$;
revoke all on function public.arcade_result_valid(text,text[],smallint[]) from public,anon;
grant execute on function public.arcade_result_valid(text,text[],smallint[]) to authenticated;

create table public.arcade_results(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 mode text not null,
 game_ids text[] not null,
 round_winners smallint[] not null,
 adult_wins integer generated always as (cardinality(array_positions(round_winners,0::smallint))) stored,
 kid_wins integer generated always as (cardinality(array_positions(round_winners,1::smallint))) stored,
 winner smallint generated always as (case when cardinality(array_positions(round_winners,0::smallint))>cardinality(array_positions(round_winners,1::smallint)) then 0 else 1 end) stored,
 completed_at timestamptz not null default now(),
 constraint arcade_completed_result check(public.arcade_result_valid(mode,game_ids,round_winners))
);
create index arcade_results_family_recent on public.arcade_results(user_id,completed_at desc);
alter table public.arcade_results enable row level security;
revoke all on public.arcade_results from public,anon,authenticated;
grant select on public.arcade_results to authenticated;
grant insert(id,user_id,mode,game_ids,round_winners) on public.arcade_results to authenticated;
create policy arcade_results_read_own on public.arcade_results for select to authenticated using((select auth.uid())=user_id);
create policy arcade_results_insert_own on public.arcade_results for insert to authenticated with check((select auth.uid())=user_id);

create function public.arcade_lifetime_score()
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('adults',count(*) filter(where winner=0),'kids',count(*) filter(where winner=1),'total',count(*))
 from public.arcade_results where user_id=(select auth.uid());
$$;
revoke all on function public.arcade_lifetime_score() from public,anon;
grant execute on function public.arcade_lifetime_score() to authenticated;
