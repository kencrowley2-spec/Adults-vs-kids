create table public.platform_events (
 id uuid primary key,
 visitor_id uuid not null,
 session_id uuid not null,
 user_id uuid references auth.users(id) on delete set null,
 event_type text not null check(event_type in ('page_view','game_start','tool_start','outbound','checkout_click','download_click')),
 path text not null check(length(path)<=181),
 detail text not null default '' check(length(detail)<=80),
 referrer text not null default 'Direct / unknown' check(length(referrer)<=253),
 device text not null default 'Desktop' check(device in ('Desktop','Mobile','Tablet')),
 dedupe_key text not null unique,
 created_at timestamptz not null default now()
);
alter table public.platform_events enable row level security;
revoke all on public.platform_events from anon,authenticated;
grant select,insert on public.platform_events to service_role;
create index platform_events_created_at_idx on public.platform_events(created_at);
create index platform_events_visitor_idx on public.platform_events(visitor_id,created_at);
create index arcade_results_completed_idx on public.arcade_results(completed_at);
create function public.platform_analytics() returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (select (now() at time zone 'America/Indiana/Indianapolis')::date as today),
days as (select today-i as day from bounds,generate_series(0,29) i),
e as (select *, (created_at at time zone 'America/Indiana/Indianapolis')::date as day from public.platform_events),
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
