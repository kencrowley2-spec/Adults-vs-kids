-- One active hosted checkout per family, payment mode, and canonical PDF cart.
create table public.pdf_purchase_intents (
 user_id uuid not null references auth.users(id) on delete cascade,
 cart_key text not null,
 live boolean not null,
 intent_id uuid not null default gen_random_uuid(),
 expires_at timestamptz not null,
 primary key(user_id,cart_key,live)
);
alter table public.pdf_purchase_intents enable row level security;
revoke all on public.pdf_purchase_intents from public,anon,authenticated;
grant select,insert,update on public.pdf_purchase_intents to service_role;

create function public.reserve_pdf_intent(p_user uuid,p_cart text,p_live boolean)
returns table(intent_id uuid,expires_at timestamptz)
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.pdf_purchase_intents as i(user_id,cart_key,live,expires_at)
 values(p_user,p_cart,p_live,now()+interval '1 hour')
 on conflict(user_id,cart_key,live) do update
 set intent_id=gen_random_uuid(),expires_at=excluded.expires_at
 where i.expires_at<=now();
 return query select i.intent_id,i.expires_at from public.pdf_purchase_intents i
 where i.user_id=p_user and i.cart_key=p_cart and i.live=p_live;
end $$;
revoke all on function public.reserve_pdf_intent(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.reserve_pdf_intent(uuid,text,boolean) to service_role;
