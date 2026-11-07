-- Private family memories. Image bytes are never served as public project assets.
create table public.club_gallery (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 100),
 source text not null default 'upload' check (source in ('upload','draw','game')),
 image_data text not null check (char_length(image_data) between 35 and 1400000 and image_data ~ '^data:image/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$'),
 image_hash text not null check (image_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 unique(user_id,image_hash)
);
create index club_gallery_family_date on public.club_gallery(user_id,created_at desc,id desc);
alter table public.club_gallery enable row level security;
revoke all on public.club_gallery from anon,authenticated;
grant select,insert on public.club_gallery to authenticated;
create policy gallery_family_read on public.club_gallery for select to authenticated using ((select auth.uid())=user_id);
create policy gallery_family_save on public.club_gallery for insert to authenticated with check ((select auth.uid())=user_id);
