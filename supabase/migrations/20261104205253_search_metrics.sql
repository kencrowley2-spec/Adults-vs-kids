-- Aggregate only: no account details or new customer tables. Existing RLS stays intact.
create function public.search_metrics() returns jsonb language sql stable security invoker set search_path='' as $$
with bounds as (select (now() at time zone 'America/Indiana/Indianapolis')::date as today),
e as (select session_id, referrer, created_at, (created_at at time zone 'America/Indiana/Indianapolis')::date as day
 from public.platform_events where event_type='page_view' and created_at>=now()-interval '31 days'),
sessions as (select session_id,min(day) as day,
 coalesce((array_agg(referrer order by created_at) filter (where referrer not in ('Internal','Direct / unknown')))[1],'Direct / unknown') as source from e group by session_id),
classified as (select *,case
 when source ~* '(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|copilot\.microsoft\.com|gemini\.google\.com)$' then 'AI referrals'
 when source ~* '(^|\.)(google\.[a-z.]+|bing\.com|search\.yahoo\.com|duckduckgo\.com|search\.brave\.com|ecosia\.org)$' then 'Organic search'
 when source='Direct / unknown' then 'Direct / unknown' else 'Other referrals' end as channel from sessions),
f as (select (to_timestamp(created_at/1000.0) at time zone 'America/Indiana/Indianapolis')::date as day from public.families),
periods as (select n,
 (select count(*) from classified,bounds where day>=today-(n-1) and channel='Organic search') as organic_visits,
 (select count(*) from classified,bounds where day>=today-(n-1) and channel='AI referrals') as ai_visits,
 (select count(*) from f,bounds where day>=today-(n-1)) as new_family_profiles
 from (values (1),(7),(30)) p(n))
select jsonb_build_object('periods',(select jsonb_object_agg(n::text,to_jsonb(periods)) from periods),
 'sources',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from (select channel,source,count(*) as visits from classified,bounds where day>=today-29 group by channel,source order by visits desc limit 25)s));
$$;
revoke all on function public.search_metrics() from public,anon,authenticated;
grant execute on function public.search_metrics() to service_role;
