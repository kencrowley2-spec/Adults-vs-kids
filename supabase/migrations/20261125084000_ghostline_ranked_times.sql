alter table public.arcade_timed_results
 drop constraint qualifying_arcade_result,
 add constraint qualifying_arcade_result check (
  (elapsed_ms is not null and (
  elapsed_ms >= 100 and (
   (game='ghostline' and score=1 and elapsed_ms between 20000 and 600000) or
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
