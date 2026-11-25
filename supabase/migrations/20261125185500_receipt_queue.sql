-- Persist transactional notifications in the same transaction as the order.
-- References only. Do not copy a family's email or address into job payloads.
create table public.order_notifications (
 kind text not null check(kind in ('digital_receipt','basket_receipt','basket_admin','basket_shipped')),
 order_id text not null,
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 primary key(kind,order_id)
);
alter table public.order_notifications enable row level security;
revoke all on public.order_notifications from public,anon,authenticated;
grant select,insert,update on public.order_notifications to service_role;
create function public.queue_order_notification() returns trigger language plpgsql
security invoker set search_path='' as $$
begin
 if tg_table_name='pdf_orders' then
  if new.status='paid' then
   insert into public.order_notifications(kind,order_id) values('digital_receipt',new.session_id) on conflict do nothing;
  end if;
 elsif tg_table_name='holiday_orders' then
  insert into public.order_notifications(kind,order_id) values('basket_receipt',new.checkout_id),('basket_admin',new.checkout_id)
  on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.queue_order_notification() from public,anon,authenticated;
grant execute on function public.queue_order_notification() to service_role;
create trigger queue_digital_receipt after insert on public.pdf_orders for each row execute function public.queue_order_notification();
create trigger queue_basket_receipt after insert on public.holiday_orders for each row execute function public.queue_order_notification();

create function public.queue_shipping_confirmation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.order_notifications(kind,order_id) values('basket_shipped',new.checkout_id) on conflict do nothing;
 return new;
end $$;
revoke all on function public.queue_shipping_confirmation() from public,anon,authenticated;
grant execute on function public.queue_shipping_confirmation() to service_role;
create trigger queue_basket_shipping after update of fulfillment on public.holiday_orders for each row
 when (old.fulfillment='packed' and new.fulfillment='shipped') execute function public.queue_shipping_confirmation();
