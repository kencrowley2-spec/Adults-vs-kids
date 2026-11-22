alter table public.family_rosters
 drop constraint family_rosters_adults_check,
 drop constraint family_rosters_kids_check,
 add constraint family_rosters_adults_check check (array_position(adults,null) is null),
 add constraint family_rosters_kids_check check (array_position(kids,null) is null);
