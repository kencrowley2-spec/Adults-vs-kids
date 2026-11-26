alter table public.pdf_orders alter column user_id drop not null;
alter table public.analytics_checkouts alter column user_id drop not null;

create table public.pdf_guest_checkouts (
 access_digest text primary key check (access_digest ~ '^[0-9a-f]{64}$'),
 session_id text not null unique check (session_id ~ '^cs_'),
 created_at timestamptz not null default now()
);
alter table public.pdf_guest_checkouts enable row level security;
revoke all on public.pdf_guest_checkouts from public, anon, authenticated;
grant select, insert on public.pdf_guest_checkouts to service_role;

create table public.pdf_guest_checkout_limits (
 key_digest text primary key check (key_digest ~ '^[0-9a-f]{64}$'),
 window_started_at timestamptz not null,
 attempts integer not null
);
create index pdf_guest_checkout_limits_window on public.pdf_guest_checkout_limits(window_started_at);
alter table public.pdf_guest_checkout_limits enable row level security;
revoke all on public.pdf_guest_checkout_limits from public, anon, authenticated;
grant select, insert, update, delete on public.pdf_guest_checkout_limits to service_role;

create function public.allow_guest_pdf_checkout(p_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare used integer;
begin
 delete from public.pdf_guest_checkout_limits where window_started_at < now() - interval '1 day';
 insert into public.pdf_guest_checkout_limits as limits (key_digest, window_started_at, attempts)
 values (p_key, now(), 1)
 on conflict (key_digest) do update set
  attempts = case when limits.window_started_at < now() - interval '1 hour' then 1 else limits.attempts + 1 end,
  window_started_at = case when limits.window_started_at < now() - interval '1 hour' then now() else limits.window_started_at end
 where limits.window_started_at < now() - interval '1 hour' or limits.attempts < 20
 returning attempts into used;
 return used is not null;
end $$;
revoke all on function public.allow_guest_pdf_checkout(text) from public, anon, authenticated;
grant execute on function public.allow_guest_pdf_checkout(text) to service_role;

create or replace function public.analytics_purchase(p_checkout text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.pdf_orders; c public.analytics_checkouts; s public.analytics_sessions; fallback jsonb; internal boolean;
begin
 if exists(select 1 from public.platform_events where dedupe_key='purchase:'||p_checkout) then return; end if;
 select * into o from public.pdf_orders where session_id=p_checkout and status='paid'; if o.session_id is null then return; end if;
 select * into c from public.analytics_checkouts where checkout_id=p_checkout and user_id is not distinct from o.user_id;
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

create or replace function public.direct_order_financials() returns jsonb
language sql stable security invoker set search_path='' as $$
with orders as (
 select o.*, (o.paid_at at time zone 'America/Indiana/Indianapolis')::date as sale_day,
 case when coalesce(a.is_internal_test,false) or coalesce(s.is_internal_test,false)
        or c.livemode=false or left(o.session_id,8)='cs_test_' then 'internal'
      when c.livemode=true or left(o.session_id,8)='cs_live_' then 'external'
      else 'unclassified' end as customer,
 case when o.product_ids && array['club-month','club-year'] then 'Initial membership payments'
      else 'Direct digital books' end as stream
 from public.pdf_orders o
 left join public.analytics_accounts a on a.user_id=o.user_id
 left join public.analytics_checkouts c on c.checkout_id=o.session_id and c.user_id is not distinct from o.user_id
 left join public.analytics_sessions s on s.id=c.session_id
 where o.currency='usd'
), calendar as (select (now() at time zone 'America/Indiana/Indianapolis')::date as today),
periods as (
 select p.label,p.since,p.position,today from calendar cross join lateral (values
 ('Today',today,1),('This week',date_trunc('week',today)::date,2),
 ('This month',date_trunc('month',today)::date,3),('Year to date',date_trunc('year',today)::date,4),
 ('Lifetime',date '-infinity',5)) p(label,since,position)
), totals as (
 select p.label,p.position,
 count(o.session_id) filter(where customer='external') as external_orders,
 coalesce(sum(amount_total) filter(where customer='external'),0) as external_gross,
 count(o.session_id) filter(where customer='internal') as internal_orders,
 coalesce(sum(amount_total) filter(where customer='internal'),0) as internal_gross,
 count(o.session_id) filter(where customer='unclassified') as unclassified_orders,
 count(o.session_id) filter(where status='revoked' and customer='external') as revoked_external
 from periods p left join orders o on o.sale_day between p.since and p.today group by p.label,p.position
), streams as (
 select stream,count(*) as orders,sum(amount_total) as gross from orders
 where customer='external' group by stream
)
select jsonb_build_object('periods',(select jsonb_agg(to_jsonb(t) order by position) from totals t),
 'streams',coalesce((select jsonb_agg(to_jsonb(s) order by stream) from streams s),'[]'::jsonb))
$$;
