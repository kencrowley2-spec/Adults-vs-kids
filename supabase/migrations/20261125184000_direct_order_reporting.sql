-- Initial direct checkout amounts only. Renewals and external revenue need provider records.
create function public.direct_order_financials() returns jsonb
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
 left join public.analytics_checkouts c on c.checkout_id=o.session_id and c.user_id=o.user_id
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
revoke all on function public.direct_order_financials() from public,anon,authenticated;
grant execute on function public.direct_order_financials() to service_role;
