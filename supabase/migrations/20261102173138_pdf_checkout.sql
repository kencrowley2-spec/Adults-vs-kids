-- Only the payment server can write purchases, attempts or asset availability.
create table public.pdf_orders (
 session_id text primary key check(session_id ~ '^cs_'),
 user_id uuid not null references auth.users(id) on delete cascade,
 product_ids text[] not null,
 book_ids text[] not null,
 amount_total integer not null check(amount_total > 0),
 currency text not null check(currency = 'usd'),
 status text not null check(status in ('paid','revoked')),
 payment_intent_id text not null,
 paid_at timestamptz not null
);
create index pdf_orders_user_paid on public.pdf_orders(user_id,paid_at desc);
create index pdf_orders_payment_intent on public.pdf_orders(payment_intent_id);
alter table public.pdf_orders enable row level security;
revoke all on public.pdf_orders from public,anon,authenticated;
grant select on public.pdf_orders to authenticated;
grant all on public.pdf_orders to service_role;
create policy pdf_owner_read on public.pdf_orders for select to authenticated using((select auth.uid())=user_id);

create table public.pdf_assets (
 book_id text primary key check(book_id in ('book-1','book-2','book-3','book-4')),
 object_path text not null unique,
 ready boolean not null default false
);
alter table public.pdf_assets enable row level security;
revoke all on public.pdf_assets from public,anon,authenticated;
grant all on public.pdf_assets to service_role;
insert into public.pdf_assets(book_id,object_path) values
 ('book-1','book-1.pdf'),('book-2','book-2.pdf'),('book-3','book-3.pdf'),('book-4','book-4.pdf');

create table public.pdf_checkout_attempts (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index pdf_attempts_user_created on public.pdf_checkout_attempts(user_id,created_at);
alter table public.pdf_checkout_attempts enable row level security;
revoke all on public.pdf_checkout_attempts from public,anon,authenticated;
grant all on public.pdf_checkout_attempts to service_role;

-- No public or customer object policies. Downloads are signed only after payment verification.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('paid-pdfs','paid-pdfs',false,52428800,array['application/pdf']);
create policy payment_server_assets on public.pdf_assets for all to service_role using(true) with check(true);
create policy payment_server_attempts on public.pdf_checkout_attempts for all to service_role using(true) with check(true);
