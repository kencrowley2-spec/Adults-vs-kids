-- Founder-only workflow data. Existing family RLS and Auth remain unchanged.
create table public.admin_message_reviews (
 message_id uuid primary key references public.messages(id) on delete cascade,
 status text not null default 'new' check(status in ('new','reviewed','archived')),
 note text not null default '' check(length(note)<=1000),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
create table public.admin_announcements (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 100),
 body text not null check(length(body) between 1 and 2000),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.admin_events (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 action text not null,
 entity_id uuid not null,
 details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.admin_message_reviews enable row level security;
alter table public.admin_announcements enable row level security;
alter table public.admin_events enable row level security;
revoke all on public.admin_message_reviews,public.admin_announcements,public.admin_events from anon,authenticated;
grant select,insert,update on public.admin_message_reviews,public.admin_announcements to authenticated;
grant select,insert on public.admin_events to authenticated;
grant usage on sequence public.admin_events_id_seq to authenticated;
create policy founder_read on public.admin_message_reviews for select to authenticated using((select auth.jwt()->>'email')='kencrowley2@gmail.com');
create policy founder_insert on public.admin_message_reviews for insert to authenticated with check((select auth.jwt()->>'email')='kencrowley2@gmail.com' and updated_by=(select auth.uid()));
create policy founder_update on public.admin_message_reviews for update to authenticated using((select auth.jwt()->>'email')='kencrowley2@gmail.com') with check((select auth.jwt()->>'email')='kencrowley2@gmail.com' and updated_by=(select auth.uid()));
create policy founder_read on public.admin_announcements for select to authenticated using((select auth.jwt()->>'email')='kencrowley2@gmail.com');
create policy member_published on public.admin_announcements for select to authenticated using(status='published');
create policy founder_insert on public.admin_announcements for insert to authenticated with check((select auth.jwt()->>'email')='kencrowley2@gmail.com' and created_by=(select auth.uid()));
create policy founder_update on public.admin_announcements for update to authenticated using((select auth.jwt()->>'email')='kencrowley2@gmail.com') with check((select auth.jwt()->>'email')='kencrowley2@gmail.com' and created_by=(select auth.uid()));
create policy founder_read on public.admin_events for select to authenticated using((select auth.jwt()->>'email')='kencrowley2@gmail.com');
create policy founder_append on public.admin_events for insert to authenticated with check((select auth.jwt()->>'email')='kencrowley2@gmail.com' and actor_id=(select auth.uid()));
create index admin_announcements_status_updated_idx on public.admin_announcements(status,updated_at desc);
create index admin_events_created_idx on public.admin_events(created_at desc);
create index families_created_idx on public.families(created_at);
create index sessions_created_idx on public.sessions(created_at);
create index app_waitlist_created_idx on public.app_waitlist(created_at);
create function public.record_admin_change() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='admin_message_reviews' then
 insert into public.admin_events(actor_id,action,entity_id,details) values(auth.uid(),'message_review',new.message_id,jsonb_build_object('status',new.status));
 else
 insert into public.admin_events(actor_id,action,entity_id,details) values(auth.uid(),'announcement_'||lower(tg_op),new.id,jsonb_build_object('status',new.status,'title',new.title));
 end if;
 return new;
end $$;
revoke all on function public.record_admin_change() from public,anon,authenticated;
create trigger review_activity after insert or update on public.admin_message_reviews for each row execute function public.record_admin_change();
create trigger announcement_activity after insert or update on public.admin_announcements for each row execute function public.record_admin_change();
create function public.admin_overview() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare start_ms bigint; daily jsonb;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'email','')<>'kencrowley2@gmail.com' then raise insufficient_privilege using message='Administrator access required';end if;
 start_ms:=(extract(epoch from date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')*1000)::bigint-518400000;
 select jsonb_agg(jsonb_build_object('day',to_char(d,'YYYY-MM-DD'),'families',(select count(*) from public.families f where f.created_at>=(extract(epoch from d)*1000)::bigint and f.created_at<(extract(epoch from d+interval '1 day')*1000)::bigint),'waitlist',(select count(*) from public.app_waitlist w where w.created_at>=(extract(epoch from d)*1000)::bigint and w.created_at<(extract(epoch from d+interval '1 day')*1000)::bigint),'sessions',(select count(*) from public.sessions s where s.created_at>=(extract(epoch from d)*1000)::bigint and s.created_at<(extract(epoch from d+interval '1 day')*1000)::bigint)) order by d) into daily from generate_series(date_trunc('day',now() at time zone 'UTC')-interval '6 days',date_trunc('day',now() at time zone 'UTC'),interval '1 day') as d;
 return jsonb_build_object('families',(select count(*) from public.families),'familiesWeek',(select count(*) from public.families where created_at>=start_ms),'messages',(select count(*) from public.messages),'unreviewed',(select count(*) from public.messages m left join public.admin_message_reviews r on r.message_id=m.id where coalesce(r.status,'new')='new'),'waitlist',(select count(*) from public.app_waitlist),'waitlistWeek',(select count(*) from public.app_waitlist where created_at>=start_ms),'interests',(select count(*) from public.legacy_interests),'sessions',(select count(*) from public.sessions),'seconds',(select coalesce(sum(seconds),0) from public.sessions),'rounds',(select coalesce(sum(rounds),0) from public.sessions),'quizzes',(select count(*) from public.quizzes),'daily',daily);
end $$;
revoke all on function public.admin_overview() from public,anon;
grant execute on function public.admin_overview() to authenticated;
