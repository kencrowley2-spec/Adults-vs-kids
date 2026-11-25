-- Shipping details stay with Stripe. The verified Checkout ID locates the address.
create table public.holiday_orders (
 checkout_id text primary key,
 payment_intent text not null unique,
 live boolean not null,
 paid_cents integer not null check(paid_cents>=9900),
 shipping_cents integer not null check(shipping_cents>=0),
 paid_at timestamptz not null,
 fulfillment text not null check(fulfillment in ('needs_review','ready_to_pack','packed','shipped','cancelled')),
 tracking_number text,
 fulfilled_at timestamptz
);
create table public.holiday_refunds (
 payment_intent text primary key,
 refunded_cents integer not null check(refunded_cents>=0),
 disputed boolean not null default false
);
alter table public.holiday_orders enable row level security;
alter table public.holiday_refunds enable row level security;
revoke all on public.holiday_orders,public.holiday_refunds from public,anon,authenticated;
grant select,insert,update on public.holiday_orders,public.holiday_refunds to service_role;

-- Slots are created only for units physically counted. Empty means no sellable inventory.
create table public.holiday_inventory (
 live boolean not null,
 unit smallint not null check(unit between 1 and 25),
 reservation uuid unique,
 checkout_id text unique,
 primary key(live,unit)
);
alter table public.holiday_inventory enable row level security;
revoke all on public.holiday_inventory from public,anon,authenticated;
grant select,insert,update on public.holiday_inventory to service_role;
create function public.reserve_holiday_unit(p_live boolean,p_reservation uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare slot smallint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_reservation::text,0));
 if exists(select 1 from public.holiday_inventory where live=p_live and reservation=p_reservation) then return true; end if;
 select unit into slot from public.holiday_inventory where live=p_live and reservation is null
 order by unit limit 1 for update skip locked;
 if slot is null then return false; end if;
 update public.holiday_inventory set reservation=p_reservation where live=p_live and unit=slot;
 return true;
end $$;
revoke all on function public.reserve_holiday_unit(boolean,uuid) from public,anon,authenticated;
grant execute on function public.reserve_holiday_unit(boolean,uuid) to service_role;
