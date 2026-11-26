alter table public.arcade_plays drop constraint arcade_plays_game_check,
 add constraint arcade_plays_game_check check(game=any(array[
  'memory','tic','spot','trivia','word','tap','picture','number','challenge','maze','rps','code',
  'golf','basketball','blocks','treasure','frog','mole','claw','lava','draw','ghostline','flex',
  'faces','hexgl','pinball','jigsaw'
 ]::text[]));
