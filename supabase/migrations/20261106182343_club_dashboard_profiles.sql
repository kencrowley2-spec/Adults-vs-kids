create table public.club_dashboard_profiles (
 user_id uuid not null references auth.users(id) on delete cascade,
 profile_key text not null check (profile_key = 'account' or profile_key ~ '^(adults|kids)-[a-f0-9]{24}$'),
 display_name text not null check (char_length(display_name) between 1 and 60),
 scene text not null default 'alpine' check (scene in ('alpine','coast','dusk')),
 headshot text not null default '' check (octet_length(headshot)<=90000 and (headshot='' or headshot ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$')),
 backdrop text not null default '' check (octet_length(backdrop)<=330000 and (backdrop='' or backdrop ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$')),
 updated_at timestamptz not null default now(),
 primary key(user_id,profile_key)
);
alter table public.club_dashboard_profiles enable row level security;
revoke all on public.club_dashboard_profiles from anon;
grant select,insert,update,delete on public.club_dashboard_profiles to authenticated;
create policy dashboard_profiles_select on public.club_dashboard_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy dashboard_profiles_insert on public.club_dashboard_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy dashboard_profiles_update on public.club_dashboard_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy dashboard_profiles_delete on public.club_dashboard_profiles for delete to authenticated using ((select auth.uid())=user_id);
