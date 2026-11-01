-- Website records use Supabase Auth IDs. Existing Sites/D1 records remain untouched.
create table public.families (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, name text not null check(length(name) between 1 and 60),
 team_a text not null default 'Team Adults' check(length(team_a) between 1 and 24),
 team_b text not null default 'Team Kids' check(length(team_b) between 1 and 24),
 clock_started_at bigint, marketing integer not null default 0 check(marketing in (0,1)),
 created_at bigint not null default (extract(epoch from now())*1000)::bigint,
 updated_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create table public.quizzes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.families(user_id) on delete cascade,
 answers text not null, score integer not null check(score between 0 and 100), grade text not null check(grade in ('A','B','C','D','F')),
 age text not null check(age in ('4-7','8-12','13+')), created_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create table public.sessions (
 id text primary key,user_id uuid not null references public.families(user_id) on delete cascade,
 seconds integer not null check(seconds between 1 and 28800),rounds integer not null check(rounds between 1 and 60),
 created_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create table public.legacy_interests (
 user_id uuid primary key references public.families(user_id) on delete cascade,
 created_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.families(user_id) on delete cascade,
 kind text not null check(kind in ('founder','assistance','challenge','feedback')),body text not null check(length(body) between 10 and 5000),
 permission integer not null default 0 check(permission in (0,1)),
 created_at bigint not null default (extract(epoch from now())*1000)::bigint,
 check(kind <> 'challenge' or permission = 1)
);
create table public.followups (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.families(user_id) on delete cascade,
 quiz_id uuid not null unique references public.quizzes(id) on delete cascade,due_at bigint not null,
 status text not null default 'awaiting_email_setup'
);
create table public.progress (
 user_id uuid primary key references public.families(user_id) on delete cascade,
 rounds text not null default '[]',updated_at bigint not null default (extract(epoch from now())*1000)::bigint
);
create table public.app_waitlist (
 email text primary key check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 name text not null check(length(name) between 1 and 80),
 created_at bigint not null default (extract(epoch from now())*1000)::bigint,
 consent_version text not null check(consent_version='app-launch-updates-v1')
);
create index quizzes_user_created on public.quizzes(user_id,created_at desc);
create index sessions_user_created on public.sessions(user_id,created_at desc);
create index messages_user_created on public.messages(user_id,created_at desc);
create index followups_user_due on public.followups(user_id,due_at);
create index followups_due on public.followups(due_at);
create index waitlist_created on public.app_waitlist(created_at desc);
-- Explicit privileges and owner policies: no public reads of customer data.
do $$ declare t text; begin
 foreach t in array array['families','quizzes','sessions','legacy_interests','messages','followups','progress'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select, insert, update, delete on public.%I to authenticated',t);
 execute format('create policy own_records on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy founder_read on public.%I for select to authenticated using ((select auth.jwt()->>''email'')=''kencrowley2@gmail.com'')',t);
 end loop;
end $$;
alter table public.app_waitlist enable row level security;
revoke all on public.app_waitlist from anon,authenticated;
grant insert on public.app_waitlist to anon,authenticated;
grant select on public.app_waitlist to authenticated;
create policy waitlist_signup on public.app_waitlist for insert to anon,authenticated with check(true);
create policy founder_read on public.app_waitlist for select to authenticated using ((select auth.jwt()->>'email')='kencrowley2@gmail.com');
-- Database-level limits remain effective even if a caller bypasses website validation.
create function public.check_quiz_interval() returns trigger language plpgsql security invoker set search_path='' as $$
declare a jsonb; total integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
 if exists(select 1 from public.quizzes where user_id=new.user_id and created_at>(extract(epoch from now())*1000)::bigint-2592000000) then
 raise exception 'One report card per 30 days'; end if;
 a:=new.answers::jsonb;
 if jsonb_typeof(a)<>'array' or jsonb_array_length(a)<>6 then raise exception 'Invalid answers';end if;
 if exists(select 1 from jsonb_array_elements(a) x where jsonb_typeof(x)<>'number' or x::text !~ '^[0-3]$') then raise exception 'Invalid answers';end if;
 select sum(value::integer) into total from jsonb_array_elements_text(a);
 new.score:=round(total/18.0*100);new.grade:=case when new.score>=85 then 'A' when new.score>=70 then 'B' when new.score>=55 then 'C' when new.score>=40 then 'D' else 'F' end;
 new.created_at:=(extract(epoch from now())*1000)::bigint;
 return new;
end $$;
revoke all on function public.check_quiz_interval() from public,anon,authenticated;
create trigger quiz_interval before insert on public.quizzes for each row execute function public.check_quiz_interval();
create function public.queue_quiz_followup() returns trigger language plpgsql security invoker set search_path='' as $$
begin insert into public.followups(user_id,quiz_id,due_at) values(new.user_id,new.id,new.created_at+2592000000);return new;end $$;
revoke all on function public.queue_quiz_followup() from public,anon,authenticated;
create trigger quiz_followup after insert on public.quizzes for each row execute function public.queue_quiz_followup();
create function public.check_message_interval() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,1));
 if (select count(*) from public.messages where user_id=new.user_id and created_at>(extract(epoch from now())*1000)::bigint-3600000)>=5 then raise exception 'Message rate limit';end if;
 new.created_at:=(extract(epoch from now())*1000)::bigint;return new;
end $$;
revoke all on function public.check_message_interval() from public,anon,authenticated;
create trigger message_interval before insert on public.messages for each row execute function public.check_message_interval();
create function public.preserve_family_clock() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.created_at:=old.created_at;
 if old.clock_started_at is not null then new.clock_started_at:=old.clock_started_at;
 elsif new.clock_started_at is not null then new.clock_started_at:=(extract(epoch from now())*1000)::bigint;end if;
 return new;
end $$;
revoke all on function public.preserve_family_clock() from public,anon,authenticated;
create trigger immutable_clock before update on public.families for each row execute function public.preserve_family_clock();
create function public.family_play_totals() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('seconds',coalesce(sum(seconds),0),'sessions',count(*)) from public.sessions where user_id=(select auth.uid());
$$;
revoke all on function public.family_play_totals() from public,anon;
grant execute on function public.family_play_totals() to authenticated;
