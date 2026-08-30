begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('customer', 'support', 'admin');
create type public.product_status as enum ('draft', 'planned', 'private_beta', 'available', 'retired');
create type public.release_channel as enum ('stable', 'beta', 'alpha');
create type public.entitlement_status as enum ('active', 'suspended', 'refunded', 'expired');
create type public.license_status as enum ('pending', 'active', 'suspended', 'revoked', 'expired');
create type public.order_status as enum ('pending', 'paid', 'refunded', 'partially_refunded', 'failed', 'disputed');
create type public.contact_status as enum ('new', 'in_progress', 'resolved', 'spam');
create type public.ticket_status as enum ('open', 'waiting_on_customer', 'in_progress', 'resolved', 'closed');
create type public.api_client_status as enum ('active', 'suspended', 'revoked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  display_name text check (display_name is null or char_length(display_name) between 1 and 120),
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  eyebrow text,
  tagline text not null,
  description text not null,
  status public.product_status not null default 'draft',
  current_version text,
  license_model text not null,
  pricing_label text,
  purchase_available boolean not null default false,
  support_lifecycle text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_features_product_sort_idx on public.product_features(product_id, sort_order);

create table public.product_platforms (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  platform text not null,
  minimum_requirements text,
  sort_order integer not null default 0,
  unique(product_id, platform)
);

create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$'),
  channel public.release_channel not null default 'stable',
  release_notes text not null default '',
  minimum_supported_version text,
  critical boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(product_id, version, channel)
);

create index product_versions_lookup_idx on public.product_versions(product_id, channel, is_published, published_at desc);

create table public.download_assets (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.product_versions(id) on delete cascade,
  platform text not null,
  architecture text not null default 'any',
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  file_name text not null,
  content_type text not null default 'application/octet-stream',
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256_hex text check (sha256_hex is null or sha256_hex ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(product_version_id, platform, architecture)
);

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  provider text not null,
  provider_price_id text,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor integer not null check (amount_minor >= 0),
  billing_interval text check (billing_interval in ('one_time', 'month', 'year')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_price_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  provider_customer_id text,
  provider_order_id text not null,
  status public.order_status not null default 'pending',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal_minor integer not null default 0 check (subtotal_minor >= 0),
  tax_minor integer not null default 0 check (tax_minor >= 0),
  total_minor integer not null default 0 check (total_minor >= 0),
  customer_email citext,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_order_id)
);

create index orders_user_created_idx on public.orders(user_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1 check (quantity > 0),
  unit_amount_minor integer not null check (unit_amount_minor >= 0),
  total_amount_minor integer not null check (total_amount_minor >= 0),
  provider_line_id text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  order_item_id uuid references public.order_items(id) on delete set null,
  status public.entitlement_status not null default 'active',
  version_policy text not null default 'current',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create unique index entitlements_active_unique_idx on public.entitlements(user_id, product_id) where status = 'active';
create index entitlements_user_idx on public.entitlements(user_id, status);

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null unique references public.entitlements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  key_prefix text not null check (char_length(key_prefix) between 4 and 16),
  key_hash bytea not null unique,
  status public.license_status not null default 'pending',
  max_activations integer not null default 1 check (max_activations between 1 and 1000),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_validated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index licenses_user_product_idx on public.licenses(user_id, product_id);
create index licenses_status_expiry_idx on public.licenses(status, expires_at);

create table public.application_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  device_fingerprint_hash bytea not null,
  device_public_key text,
  device_name text check (device_name is null or char_length(device_name) <= 160),
  platform text not null,
  app_version text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(product_id, device_fingerprint_hash)
);

create index installations_user_idx on public.application_installations(user_id, product_id);

create table public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  installation_id uuid not null references public.application_installations(id) on delete cascade,
  activation_token_hash bytea not null unique,
  activated_at timestamptz not null default now(),
  last_validated_at timestamptz,
  deactivated_at timestamptz,
  deactivation_reason text,
  device_name text,
  platform text,
  created_at timestamptz not null default now(),
  unique(license_id, installation_id)
);

create index license_activations_license_active_idx on public.license_activations(license_id) where deactivated_at is null;

create table public.api_clients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash bytea not null unique,
  scopes text[] not null default '{}',
  status public.api_client_status not null default 'active',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.request_nonces (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  nonce_hash bytea not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(scope, nonce_hash)
);

create index request_nonces_expiry_idx on public.request_nonces(expires_at);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'received' check (status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempts integer not null default 0,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null,
  company text,
  topic text not null check (topic in ('project', 'product', 'support', 'consulting', 'other')),
  message text not null,
  status public.contact_status not null default 'new',
  source_ip inet,
  user_agent text,
  consented_at timestamptz not null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_submissions_status_created_idx on public.contact_submissions(status, created_at desc);

create table public.support_articles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  slug citext not null unique,
  title text not null,
  summary text,
  body_markdown text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  subject text not null,
  status public.ticket_status not null default 'open',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_user_idx on public.support_tickets(user_id, created_at desc);
create index support_tickets_queue_idx on public.support_tickets(status, priority, created_at);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  title text not null,
  project_type text not null,
  summary text not null,
  body_markdown text,
  client_name text,
  is_concept boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.api_request_logs (
  id bigint generated always as identity primary key,
  request_id uuid not null default gen_random_uuid(),
  route text not null,
  method text not null,
  response_status integer not null,
  user_id uuid references auth.users(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  license_id uuid references public.licenses(id) on delete set null,
  ip_address inet,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index api_request_logs_route_created_idx on public.api_request_logs(route, created_at desc);
create index api_request_logs_license_created_idx on public.api_request_logs(license_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'user' check (actor_type in ('user', 'service', 'system', 'webhook')),
  action text not null,
  target_type text not null,
  target_id text,
  request_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_target_idx on public.audit_logs(target_type, target_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);

create table public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_support_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('support', 'admin')
  );
$$;

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_window_seconds integer,
  p_request_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_window_seconds < 1 or p_request_limit < 1 then
    return false;
  end if;

  insert into public.rate_limit_buckets(bucket_key, window_started_at, request_count, updated_at)
  values (p_bucket_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds)
      then v_now else public.rate_limit_buckets.window_started_at end,
    request_count = case
      when public.rate_limit_buckets.window_started_at <= v_now - make_interval(secs => p_window_seconds)
      then 1 else public.rate_limit_buckets.request_count + 1 end,
    updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_request_limit;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger entitlements_updated_at before update on public.entitlements for each row execute function public.set_updated_at();
create trigger licenses_updated_at before update on public.licenses for each row execute function public.set_updated_at();
create trigger contacts_updated_at before update on public.contact_submissions for each row execute function public.set_updated_at();
create trigger support_articles_updated_at before update on public.support_articles for each row execute function public.set_updated_at();
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();
create trigger portfolio_updated_at before update on public.portfolio_projects for each row execute function public.set_updated_at();

commit;
