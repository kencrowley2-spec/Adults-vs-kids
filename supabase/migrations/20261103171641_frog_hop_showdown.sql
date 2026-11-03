-- Add best-of-three Frog Hop while retaining historical Word Scramble results.
create or replace function public.arcade_result_valid(p_mode text,p_games text[],p_rounds smallint[])
returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(
  p_mode in ('single','series')
  and array_position(p_games,null) is null and array_position(p_rounds,null) is null
  and p_games <@ array['memory','tic','spot','trivia','word','tap','picture','number','challenge','maze','rps','code','golf','basketball','blocks','treasure','frog']::text[]
  and p_rounds <@ array[0,1]::smallint[]
  and case when p_mode='series' then
   cardinality(p_games)=3 and cardinality(p_rounds)=3
   and p_games[1]<>p_games[2] and p_games[1]<>p_games[3] and p_games[2]<>p_games[3]
  when p_games=array['basketball']::text[] or p_games=array['blocks']::text[] or p_games=array['treasure']::text[] then cardinality(p_rounds)=1
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
