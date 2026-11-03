create table public.family_rosters (
 user_id uuid primary key references public.families(user_id) on delete cascade,
 adults text[] not null default '{}'::text[] check(cardinality(adults)<=10 and array_position(adults,null) is null),
 kids text[] not null default '{}'::text[] check(cardinality(kids)<=5 and array_position(kids,null) is null),
 updated_at timestamptz not null default now()
);
alter table public.family_rosters enable row level security;
revoke all on public.family_rosters from anon,authenticated;
grant select,insert,update on public.family_rosters to authenticated;
create policy roster_owner_read on public.family_rosters for select to authenticated using((select auth.uid())=user_id);
create policy roster_owner_insert on public.family_rosters for insert to authenticated with check((select auth.uid())=user_id);
create policy roster_owner_update on public.family_rosters for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
