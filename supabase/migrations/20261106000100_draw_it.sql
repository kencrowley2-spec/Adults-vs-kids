-- Pending review: do not apply to production before game approval.
-- Store counters only. Drawings and guesses never enter the database.
create table public.draw_it_vision_budgets (
 scope text primary key,
 budget_day date not null default current_date,
 calls integer not null default 0,
 last_call timestamptz
);
alter table public.draw_it_vision_budgets enable row level security;
revoke all on public.draw_it_vision_budgets from anon,authenticated;
create or replace function public.consume_draw_it_vision()
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); family public.draw_it_vision_budgets; total public.draw_it_vision_budgets;
begin
 if actor is null then return false; end if;
 -- Global row first gives consistent lock order for simultaneous requests.
 insert into public.draw_it_vision_budgets(scope) values ('global'),(actor::text) on conflict do nothing;
 select * into total from public.draw_it_vision_budgets where scope='global' for update;
 select * into family from public.draw_it_vision_budgets where scope=actor::text for update;
 if total.budget_day<>current_date then total.calls:=0; end if;
 if family.budget_day<>current_date then family.calls:=0; end if;
 if total.calls>=500 or family.calls>=30 or family.last_call>now()-interval '4 seconds' then return false; end if;
 update public.draw_it_vision_budgets set calls=total.calls+1,budget_day=current_date,last_call=now() where scope='global';
 update public.draw_it_vision_budgets set calls=family.calls+1,budget_day=current_date,last_call=now() where scope=actor::text;
 return true;
end;
$$;
revoke all on function public.consume_draw_it_vision() from public,anon;
grant execute on function public.consume_draw_it_vision() to authenticated;

-- Lava stores one completed match winner after its three full rounds / tiebreak.
create or replace function public.arcade_result_valid(p_mode text,p_games text[],p_rounds smallint[])
returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(
  p_mode in ('single','series')
  and array_position(p_games,null) is null and array_position(p_rounds,null) is null
  and p_games <@ array['memory','tic','spot','trivia','word','tap','picture','number','challenge','maze','rps','code','golf','basketball','blocks','treasure','frog','mole','claw','lava','draw']::text[]
  and p_rounds <@ array[0,1]::smallint[]
  and case when p_mode='series' then
   cardinality(p_games)=3 and cardinality(p_rounds)=3
   and p_games[1]<>p_games[2] and p_games[1]<>p_games[3] and p_games[2]<>p_games[3]
  when p_games=array['draw']::text[] or p_games=array['lava']::text[] or p_games=array['claw']::text[] or p_games=array['mole']::text[] or p_games=array['basketball']::text[] or p_games=array['blocks']::text[] or p_games=array['treasure']::text[] then cardinality(p_rounds)=1
  when p_games=array['frog']::text[] then
   cardinality(p_rounds) between 2 and 3
   and greatest(cardinality(array_positions(p_rounds,0::smallint)),cardinality(array_positions(p_rounds,1::smallint)))=2
   and cardinality(array_positions(p_rounds[1:cardinality(p_rounds)-1],0::smallint))<2
   and cardinality(array_positions(p_rounds[1:cardinality(p_rounds)-1],1::smallint))<2
  else
   cardinality(p_games)=1 and cardinality(p_rounds) between 3 and 5
   and greatest(cardinality(array_positions(p_rounds,0::smallint)),cardinality(array_positions(p_rounds,1::smallint)))=3
   and cardinality(array_positions(p_rounds[1:cardinality(p_rounds)-1],0::smallint))<3
   and cardinality(array_positions(p_rounds[1:cardinality(p_rounds)-1],1::smallint))<3
  end,false);
$$;
