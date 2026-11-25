-- Keep the existing rules for historical results and all other games.
alter table public.arcade_results
 drop constraint arcade_completed_result,
 add constraint arcade_completed_result check (
   public.arcade_result_valid(mode,game_ids,round_winners)
   or (mode='single' and game_ids=array['memory']::text[]
       and (round_winners=array[0]::smallint[] or round_winners=array[1]::smallint[]))
 );
