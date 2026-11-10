-- First-party analytics only. These tables and functions are server/service-role private.
create table public.analytics_sessions (
 id uuid primary key default gen_random_uuid(), visitor_id uuid not null,
 first_session_id uuid not null, started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 landing_path text not null check(length(landing_path)<=181), referrer text not null default '' check(length(referrer)<=253),
 source text not null check(length(source)<=253),
 utm_source text not null default '' check(length(utm_source)<=100), utm_medium text not null default '' check(length(utm_medium)<=100),
 utm_campaign text not null default '' check(length(utm_campaign)<=100), utm_content text not null default '' check(length(utm_content)<=100), utm_term text not null default '' check(length(utm_term)<=100),
 is_internal_test boolean not null default false, test_run_id uuid
);
create index analytics_sessions_visitor_started on public.analytics_sessions(visitor_id,started_at);
create index analytics_sessions_started on public.analytics_sessions(started_at);
create table public.analytics_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 signup_session_id uuid references public.analytics_sessions(id), latest_session_id uuid references public.analytics_sessions(id),
 signup_verified_at timestamptz, is_internal_test boolean not null default false
);
create table public.analytics_checkouts (
 checkout_id text primary key check(length(checkout_id)<=255), session_id uuid not null references public.analytics_sessions(id),
 user_id uuid not null references auth.users(id) on delete cascade, livemode boolean not null, created_at timestamptz not null default now()
);
create index analytics_checkouts_user on public.analytics_checkouts(user_id);
alter table public.analytics_sessions enable row level security;
alter table public.analytics_accounts enable row level security;
alter table public.analytics_checkouts enable row level security;
revoke all on public.analytics_sessions,public.analytics_accounts,public.analytics_checkouts from public,anon,authenticated;
grant select,insert,update on public.analytics_sessions,public.analytics_accounts,public.analytics_checkouts to service_role;
create policy analytics_sessions_server on public.analytics_sessions for all to service_role using(true) with check(true);
create policy analytics_accounts_server on public.analytics_accounts for all to service_role using(true) with check(true);
create policy analytics_checkouts_server on public.analytics_checkouts for all to service_role using(true) with check(true);
alter table public.platform_events drop constraint platform_events_event_type_check;
alter table public.platform_events add constraint platform_events_event_type_check check(event_type in ('page_view','game_start','tool_start','outbound','checkout_click','download_click','signup','game_complete','first_completed_game','purchase'));
alter table public.platform_events add column analytics_session_id uuid references public.analytics_sessions(id), add column is_internal_test boolean not null default false, add column test_run_id uuid, add column evidence text not null default 'legacy', add column payment_session text;
grant update on public.platform_events to service_role;
create index platform_events_analytics_session on public.platform_events(analytics_session_id,event_type);
create index platform_events_user_type on public.platform_events(user_id,event_type);
create index analytics_accounts_signup_session on public.analytics_accounts(signup_session_id);
create index analytics_accounts_latest_session on public.analytics_accounts(latest_session_id);
create index analytics_sessions_first on public.analytics_sessions(first_session_id);

create function public.analytics_context(p_input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v uuid:=(p_input->>'visitor')::uuid; s public.analytics_sessions; sid uuid; first_id uuid; u jsonb:=coalesce(p_input->'utm','{}'); is_test boolean:=coalesce((p_input->>'internal')::boolean,false);
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v::text,0));
 is_test:=is_test or exists(select 1 from public.analytics_sessions where visitor_id=v and is_internal_test);
 select * into s from public.analytics_sessions where id=nullif(p_input->>'session','')::uuid and visitor_id=v for update;
 if s.id is null or s.last_seen_at<=now()-interval '30 minutes' then
  sid:=gen_random_uuid(); select id into first_id from public.analytics_sessions where visitor_id=v order by started_at,id limit 1;
  insert into public.analytics_sessions(id,visitor_id,first_session_id,landing_path,referrer,source,utm_source,utm_medium,utm_campaign,utm_content,utm_term,is_internal_test,test_run_id)
  values(sid,v,coalesce(first_id,sid),left(coalesce(p_input->>'path','/'),181),left(coalesce(p_input->>'referrer',''),253),left(coalesce(nullif(u->>'source',''),nullif(p_input->>'referrer',''),'Direct / unknown'),253),left(coalesce(u->>'source',''),100),left(coalesce(u->>'medium',''),100),left(coalesce(u->>'campaign',''),100),left(coalesce(u->>'content',''),100),left(coalesce(u->>'term',''),100),is_test,coalesce(nullif(p_input->>'test_run','')::uuid,(select test_run_id from public.analytics_sessions where visitor_id=v and test_run_id is not null order by started_at desc limit 1))) returning * into s;
 else
  update public.analytics_sessions set last_seen_at=now(),is_internal_test=is_internal_test or is_test where id=s.id returning * into s;
 end if;
 return to_jsonb(s);
end $$;

create function public.analytics_event(p_session uuid,p_type text,p_id uuid,p_user uuid,p_detail text,p_path text,p_device text,p_evidence text) returns void language plpgsql security invoker set search_path='' as $$
declare s public.analytics_sessions; k text; prior boolean;
begin
 select * into strict s from public.analytics_sessions where id=p_session;
 if p_type not in ('page_view','game_start','tool_start','outbound','checkout_click','download_click','game_complete','signup','first_completed_game','purchase') then raise exception 'Unknown event'; end if;
 if p_evidence='saved_result' then
  if p_type<>'game_complete' or not exists(select 1 from public.arcade_results where id=p_id and user_id=p_user) then raise exception 'Saved result required'; end if;
 elsif p_type in ('signup','first_completed_game','purchase') then raise exception 'Conversion requires dedicated server function';
 end if;
 k:=case when p_type in ('game_start','game_complete') then p_type||':'||p_id::text else p_type||':'||s.id::text||':'||left(p_path,181)||':'||left(p_detail,80)||':'||floor(extract(epoch from now())/60)::text end;
 insert into public.platform_events(id,visitor_id,session_id,analytics_session_id,user_id,event_type,path,detail,referrer,device,dedupe_key,is_internal_test,test_run_id,evidence)
 values(gen_random_uuid(),s.visitor_id,s.id,s.id,p_user,p_type,left(p_path,181),left(p_detail,80),coalesce(nullif(s.referrer,''),'Direct / unknown'),p_device,k,s.is_internal_test,s.test_run_id,p_evidence)
 on conflict(dedupe_key) do update set evidence=case when excluded.evidence='saved_result' then excluded.evidence else public.platform_events.evidence end,user_id=coalesce(public.platform_events.user_id,excluded.user_id);
 if p_evidence='saved_result' and p_user is not null then
  -- Serialize first-completion selection across concurrent games for an account.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,1));
  select (select id from public.arcade_results where user_id=p_user order by completed_at,id limit 1) is distinct from p_id or exists(select 1 from public.arcade_timed_results where user_id=p_user) into prior;
  if not prior then
   insert into public.platform_events(id,visitor_id,session_id,analytics_session_id,user_id,event_type,path,detail,referrer,device,dedupe_key,is_internal_test,test_run_id,evidence)
   values(gen_random_uuid(),s.visitor_id,s.id,s.id,p_user,'first_completed_game','/arcade',left(p_detail,80),coalesce(nullif(s.referrer,''),'Direct / unknown'),p_device,'first_game:'||p_user::text,s.is_internal_test,s.test_run_id,'saved_result') on conflict(dedupe_key) do nothing;
  end if;
 end if;
end $$;

create function public.analytics_account(p_user uuid,p_session uuid,p_stage text) returns void language plpgsql security invoker set search_path='' as $$
declare s public.analytics_sessions; a public.analytics_accounts;
begin
 select * into strict s from public.analytics_sessions where id=p_session;
 if p_stage not in ('intent','verified') then raise exception 'Invalid account stage'; end if;
 insert into public.analytics_accounts(user_id,signup_session_id,latest_session_id,is_internal_test)
 values(p_user,case when p_stage='intent' then s.id end,s.id,s.is_internal_test)
 on conflict(user_id) do update set latest_session_id=excluded.latest_session_id,is_internal_test=public.analytics_accounts.is_internal_test or excluded.is_internal_test;
 select * into strict a from public.analytics_accounts where user_id=p_user for update;
 -- Only a verified callback/login with an observed signup intent counts. Historical sign-ins are not signups.
 if p_stage='verified' and a.signup_session_id is not null and a.signup_verified_at is null then
  update public.analytics_accounts set signup_verified_at=now() where user_id=p_user;
  select * into strict s from public.analytics_sessions where id=a.signup_session_id;
  insert into public.platform_events(id,visitor_id,session_id,analytics_session_id,user_id,event_type,path,referrer,dedupe_key,is_internal_test,test_run_id,evidence)
  values(gen_random_uuid(),s.visitor_id,s.id,s.id,p_user,'signup','/auth/confirm',coalesce(nullif(s.referrer,''),'Direct / unknown'),'signup:'||p_user::text,s.is_internal_test or a.is_internal_test,s.test_run_id,'verified_account') on conflict(dedupe_key) do nothing;
 end if;
end $$;

create function public.analytics_purchase(p_checkout text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.pdf_orders; c public.analytics_checkouts; s public.analytics_sessions; fallback jsonb; internal boolean;
begin
 if exists(select 1 from public.platform_events where dedupe_key='purchase:'||p_checkout) then return; end if;
 select * into o from public.pdf_orders where session_id=p_checkout and status='paid'; if o.session_id is null then return; end if;
 select * into c from public.analytics_checkouts where checkout_id=p_checkout and user_id=o.user_id;
 if c.checkout_id is not null then select * into s from public.analytics_sessions where id=c.session_id;
 else
  -- No cookie/mapping does not imply Direct. Retain an explicitly unattributed conversion.
  select coalesce(is_internal_test,false) into internal from public.analytics_accounts where user_id=o.user_id;
  fallback:=public.analytics_context(jsonb_build_object('visitor',gen_random_uuid(),'path','/','referrer','Unattributed','internal',coalesce(internal,false)));
  select * into s from public.analytics_sessions where id=(fallback->>'id')::uuid;
 end if;
 insert into public.platform_events(id,visitor_id,session_id,analytics_session_id,user_id,event_type,path,detail,referrer,dedupe_key,is_internal_test,test_run_id,evidence,payment_session)
 values(gen_random_uuid(),s.visitor_id,s.id,s.id,o.user_id,'purchase','/family/downloads','Verified paid checkout',coalesce(nullif(s.referrer,''),'Direct / unknown'),'purchase:'||p_checkout,s.is_internal_test or (c.checkout_id is not null and not c.livemode),s.test_run_id,'verified_payment',p_checkout)
 on conflict(dedupe_key) do nothing;
end $$;

create function public.platform_funnel() returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as(select (now() at time zone 'America/Indiana/Indianapolis')::date today),
s as(select a.*,f.source first_touch_source from public.analytics_sessions a join public.analytics_sessions f on f.id=a.first_session_id where not a.is_internal_test),
e as(select e.*,s.source,(e.created_at at time zone 'America/Indiana/Indianapolis')::date as day from public.platform_events e join s on s.id=e.analytics_session_id left join public.analytics_accounts a on a.user_id=e.user_id where not e.is_internal_test and not coalesce(a.is_internal_test,false) and (e.event_type<>'purchase' or exists(select 1 from public.pdf_orders o where o.session_id=e.payment_session and o.status='paid'))),
ranges as(select n from unnest(array[1,7,30]) n),
sources as(select distinct source from s),
source_counts as(select n,source,
 (select count(distinct session_id) from e,bounds where e.source=c.source and day>=today-(n-1) and event_type='page_view') sessions,
 (select count(distinct user_id) from e,bounds where e.source=c.source and day>=today-(n-1) and event_type='signup') signups,
 (select count(distinct user_id) from e,bounds where e.source=c.source and day>=today-(n-1) and event_type='first_completed_game') first_games,
 (select count(*) from e,bounds where e.source=c.source and day>=today-(n-1) and event_type='purchase') purchases
 from sources c cross join ranges),
weeks as(select distinct date_trunc('week',day::timestamp)::date as week from e,bounds where day>=today-29),
weekly as(select week,
 (select count(distinct session_id) from e where date_trunc('week',day::timestamp)::date=w.week and event_type='page_view') sessions,
 (select count(distinct user_id) from e where date_trunc('week',day::timestamp)::date=w.week and event_type='signup') signups,
 (select count(distinct user_id) from e where date_trunc('week',day::timestamp)::date=w.week and event_type='first_completed_game') first_games,
 (select count(*) from e where date_trunc('week',day::timestamp)::date=w.week and event_type='purchase') purchases from weeks w),
cohort as(select n,c.source,count(*) signups,count(*) filter(where exists(select 1 from e g where g.user_id=c.user_id and g.event_type='first_completed_game' and g.created_at>=c.created_at)) first_games,count(*) filter(where exists(select 1 from e p where p.user_id=c.user_id and p.event_type='purchase' and p.created_at>=c.created_at)) purchasers from e c cross join ranges cross join bounds where c.event_type='signup' and c.day>=today-(n-1) group by n,c.source)
select jsonb_build_object('since',(select min(started_at) from public.analytics_sessions),'timezone','America/Indiana/Indianapolis','sources',coalesce((select jsonb_agg(to_jsonb(x) order by n,source) from source_counts x),'[]'::jsonb),'weekly',coalesce((select jsonb_agg(to_jsonb(x) order by week) from weekly x),'[]'::jsonb),'cohorts',coalesce((select jsonb_agg(to_jsonb(x) order by n,source) from cohort x),'[]'::jsonb),'excludedEvents',(select count(*) from public.platform_events e left join public.analytics_sessions s on s.id=e.analytics_session_id left join public.analytics_accounts a on a.user_id=e.user_id where e.is_internal_test or s.is_internal_test or a.is_internal_test),'legacyEvents',(select count(*) from public.platform_events where analytics_session_id is null));
$$;
revoke all on function public.analytics_context(jsonb),public.analytics_event(uuid,text,uuid,uuid,text,text,text,text),public.analytics_account(uuid,uuid,text),public.analytics_purchase(text),public.platform_funnel() from public,anon,authenticated;
grant execute on function public.analytics_context(jsonb),public.analytics_event(uuid,text,uuid,uuid,text,text,text,text),public.analytics_account(uuid,uuid,text),public.analytics_purchase(text),public.platform_funnel() to service_role;

-- Preserve legacy reporting, excluding newly designated internal event rows.
create or replace function public.platform_analytics() returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (select (now() at time zone 'America/Indiana/Indianapolis')::date as today),
days as (select today-i as day from bounds,generate_series(0,29) i),
e as (select *, (created_at at time zone 'America/Indiana/Indianapolis')::date as day from public.platform_events pe where not pe.is_internal_test and not exists(select 1 from public.analytics_sessions ax where ax.id=pe.analytics_session_id and ax.is_internal_test) and not exists(select 1 from public.analytics_accounts ac where ac.user_id=pe.user_id and ac.is_internal_test)),
a as (select *, (completed_at at time zone 'America/Indiana/Indianapolis')::date as day from public.arcade_results),
f as (select (to_timestamp(created_at/1000.0) at time zone 'America/Indiana/Indianapolis')::date as day from public.families),
o as (select *, (paid_at at time zone 'America/Indiana/Indianapolis')::date as day from public.pdf_orders),
s as (select *, (to_timestamp(created_at/1000.0) at time zone 'America/Indiana/Indianapolis')::date as day from public.sessions),
w as (select (to_timestamp(created_at/1000.0) at time zone 'America/Indiana/Indianapolis')::date as day from public.app_waitlist),
q as (select (to_timestamp(created_at/1000.0) at time zone 'America/Indiana/Indianapolis')::date as day from public.quizzes),
daily as (select d.day,
 (select count(distinct visitor_id) from e where e.day=d.day and event_type='page_view') as visitors,
 (select count(distinct session_id) from e where e.day=d.day and event_type='page_view') as visits,
 (select count(*) from e where e.day=d.day and event_type='page_view') as views,
 (select count(*) from e where e.day=d.day and event_type='game_start') as starts,
 (select count(*) from a where a.day=d.day) as matches,
 (select count(*) from f where f.day=d.day) as families,
 (select count(*) from w where w.day=d.day) as waitlist,
 (select count(*) from q where q.day=d.day) as quizzes,
 (select count(*) from o where o.day=d.day and status='paid') as orders,
 (select coalesce(sum(amount_total),0) from o where o.day=d.day and status='paid' and currency='usd') as revenue,
 (select count(*) from s where s.day=d.day) as sessions,
 (select coalesce(sum(seconds),0) from s where s.day=d.day) as seconds,
 (select count(distinct user_id) from e where e.day=d.day) as active_families,
 (select count(*) from e where e.day=d.day and event_type='tool_start') as tools,
 (select count(*) from e where e.day=d.day and event_type='outbound') as amazon,
 (select count(*) from e where e.day=d.day and event_type='checkout_click') as checkout_clicks,
 (select count(*) from e where e.day=d.day and event_type='download_click') as download_clicks
 from days d),
periods as (select n,
 (select count(distinct visitor_id) from e,bounds where e.day>=today-(n-1) and event_type='page_view') as visitors,
 (select count(distinct session_id) from e,bounds where e.day>=today-(n-1) and event_type='page_view') as visits,
 (select count(distinct user_id) from e,bounds where e.day>=today-(n-1)) as active_families
 from (values (1),(7),(30)) as n(n)),
games as (select game,
 (select count(*) from e,bounds where event_type='game_start' and detail=game and e.day>=today-29) as starts,
 count(*) as completed_games
 from a cross join lateral unnest(a.game_ids) game,bounds where a.day>=today-29 group by game)
select jsonb_build_object('timezone','America/Indiana/Indianapolis','trackingSince',(select min(created_at) from e),
 'daily',(select coalesce(jsonb_agg(to_jsonb(daily) order by day),'[]') from daily),
 'periods',(select jsonb_object_agg(n::text,to_jsonb(periods)) from periods),
 'games',(select coalesce(jsonb_agg(to_jsonb(g) order by starts desc,completed_games desc),'[]') from (
 select coalesce(games.game,started.game) as game,coalesce(started.starts,0) as starts,coalesce(completed_games,0) as completed_games from games full join (select detail as game,count(*) starts from e,bounds where event_type='game_start' and e.day>=today-29 group by detail) started on games.game=started.game)g),
 'pages',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from (select path,count(*) views from e,bounds where event_type='page_view' and e.day>=today-29 group by path order by views desc limit 10)p),
 'sources',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from (select referrer,count(*) views from e,bounds where event_type='page_view' and e.day>=today-29 group by referrer order by views desc limit 10)p),
 'devices',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from (select device,count(*) views from e,bounds where event_type='page_view' and e.day>=today-29 group by device order by views desc)p),
 'totals',jsonb_build_object('matches',(select count(*) from a),'rounds',(select coalesce(sum(cardinality(round_winners)),0) from a),'playingFamilies',(select count(distinct user_id) from a),'orders',(select count(*) from o where status='paid'),'revenue',(select coalesce(sum(amount_total),0) from o where status='paid' and currency='usd'),'revoked',(select count(*) from o where status='revoked')));
$$;
revoke all on function public.platform_analytics() from public,anon,authenticated;
grant execute on function public.platform_analytics() to service_role;
