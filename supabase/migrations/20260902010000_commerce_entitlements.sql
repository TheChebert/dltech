begin;

create type public.commerce_environment as enum ('internal', 'test', 'live');
create type public.license_type as enum ('perpetual', 'subscription', 'trial', 'account');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email citext not null unique,
  display_name text check (display_name is null or char_length(display_name) between 1 and 160),
  provider text,
  provider_customer_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_customer_id)
);

create index customers_auth_user_idx on public.customers(auth_user_id) where auth_user_id is not null;

create table public.product_editions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  code citext not null check (code::text ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  license_type public.license_type not null,
  activation_required boolean not null default true,
  activation_limit integer not null default 1 check (activation_limit between 0 and 1000),
  version_policy text not null default 'current',
  refresh_interval_days integer not null default 30 check (refresh_interval_days between 1 and 3650),
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, code),
  check ((activation_required and activation_limit > 0) or (not activation_required and activation_limit = 0))
);

create index product_editions_product_sort_idx on public.product_editions(product_id, sort_order);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, feature_key)
);

create table public.edition_features (
  edition_id uuid not null references public.product_editions(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  value jsonb not null default 'true'::jsonb,
  created_at timestamptz not null default now(),
  primary key (edition_id, feature_id)
);

alter table public.product_prices
  add column edition_id uuid references public.product_editions(id) on delete cascade,
  add column provider_product_id text,
  add column environment public.commerce_environment not null default 'test',
  add column is_default boolean not null default false;

create unique index product_prices_edition_active_idx
on public.product_prices(edition_id, provider, environment, currency)
where active and edition_id is not null;

create unique index product_prices_edition_default_idx
on public.product_prices(edition_id, provider, environment)
where active and is_default and edition_id is not null;

alter table public.orders
  add column customer_id uuid references public.customers(id) on delete set null,
  add column checkout_access_token_hash bytea;

create unique index orders_checkout_access_token_idx
on public.orders(checkout_access_token_hash)
where checkout_access_token_hash is not null;

create index orders_customer_created_idx on public.orders(customer_id, created_at desc);

alter table public.order_items
  add column edition_id uuid references public.product_editions(id),
  add column product_price_id uuid references public.product_prices(id) on delete set null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  provider text not null,
  provider_payment_id text not null,
  provider_checkout_id text,
  status public.payment_status not null default 'pending',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor integer not null check (amount_minor >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_payment_id)
);

create index payments_order_idx on public.payments(order_id, created_at desc);
create index payments_customer_idx on public.payments(customer_id, created_at desc);

alter table public.entitlements
  alter column user_id drop not null,
  add column customer_id uuid references public.customers(id) on delete cascade,
  add column edition_id uuid references public.product_editions(id),
  add constraint entitlements_owner_check check (user_id is not null or customer_id is not null);

drop index if exists public.entitlements_active_unique_idx;
create unique index entitlements_order_item_unique_idx
on public.entitlements(order_item_id)
where order_item_id is not null;

alter table public.licenses
  alter column user_id drop not null,
  add column customer_id uuid references public.customers(id) on delete cascade,
  add column edition_id uuid references public.product_editions(id),
  add column key_ciphertext text,
  add constraint licenses_owner_check check (user_id is not null or customer_id is not null);

create index licenses_customer_product_idx on public.licenses(customer_id, product_id);

alter table public.application_installations
  alter column user_id drop not null,
  add column customer_id uuid references public.customers(id) on delete cascade,
  add constraint installations_owner_check check (user_id is not null or customer_id is not null);

create index installations_customer_idx on public.application_installations(customer_id, product_id);

alter table public.webhook_events
  add column locked_at timestamptz,
  add column updated_at timestamptz not null default now();

create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger product_editions_updated_at before update on public.product_editions for each row execute function public.set_updated_at();
create trigger features_updated_at before update on public.features for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger webhook_events_updated_at before update on public.webhook_events for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.product_editions enable row level security;
alter table public.features enable row level security;
alter table public.edition_features enable row level security;
alter table public.payments enable row level security;

create policy product_editions_public_read on public.product_editions for select to anon, authenticated
using (
  active and exists (
    select 1 from public.products
    where products.id = product_editions.product_id
      and products.published_at is not null
      and products.status in ('planned', 'private_beta', 'available')
  )
);

create policy features_public_read on public.features for select to anon, authenticated
using (
  exists (
    select 1 from public.products
    where products.id = features.product_id
      and products.published_at is not null
      and products.status in ('planned', 'private_beta', 'available')
  )
);

create policy edition_features_public_read on public.edition_features for select to anon, authenticated
using (
  exists (
    select 1 from public.product_editions
    join public.products on products.id = product_editions.product_id
    where product_editions.id = edition_features.edition_id
      and product_editions.active
      and products.published_at is not null
      and products.status in ('planned', 'private_beta', 'available')
  )
);

create policy customers_select_own on public.customers for select to authenticated
using (auth_user_id = (select auth.uid()) or public.is_admin());

create policy payments_select_own on public.payments for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = payments.order_id
      and (orders.user_id = (select auth.uid()) or public.is_admin())
  )
);

create policy admins_manage_customers on public.customers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_product_editions on public.product_editions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_features on public.features for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_edition_features on public.edition_features for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_payments on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.customers, public.product_editions, public.features, public.edition_features, public.payments from anon, authenticated;
grant select on public.product_editions, public.features, public.edition_features to anon, authenticated;
grant select on public.customers, public.payments to authenticated;
grant select, insert, update, delete on public.customers, public.product_editions, public.features, public.edition_features, public.payments to authenticated;

create or replace function public.claim_webhook_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_payload_sha256 text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.webhook_events%rowtype;
  v_now timestamptz := now();
begin
  select * into v_event
  from public.webhook_events
  where provider = p_provider and provider_event_id = p_provider_event_id
  for update;

  if not found then
    insert into public.webhook_events (
      provider, provider_event_id, event_type, payload_sha256, status, attempts, locked_at
    ) values (
      p_provider, p_provider_event_id, p_event_type, p_payload_sha256, 'processing', 1, v_now
    );
    return 'claimed';
  end if;

  if v_event.payload_sha256 <> p_payload_sha256 then
    return 'payload_mismatch';
  end if;

  if v_event.status in ('processed', 'ignored') then
    return 'already_processed';
  end if;

  if v_event.status = 'processing' and v_event.locked_at > v_now - interval '5 minutes' then
    return 'already_processing';
  end if;

  update public.webhook_events
  set status = 'processing', attempts = attempts + 1, locked_at = v_now, last_error = null
  where id = v_event.id;

  return 'claimed';
end;
$$;

create or replace function public.fulfill_commerce_order(
  p_order_id uuid,
  p_customer_email citext,
  p_provider_customer_id text,
  p_provider_payment_id text,
  p_provider_checkout_id text,
  p_currency text,
  p_amount_minor integer,
  p_license_key_prefix text,
  p_license_key_hash bytea,
  p_license_key_ciphertext text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_customer_id uuid;
  v_order_item public.order_items%rowtype;
  v_edition public.product_editions%rowtype;
  v_entitlement_id uuid;
  v_license_id uuid;
  v_existing boolean := false;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.currency <> upper(p_currency) or v_order.total_minor <> p_amount_minor then
    raise exception 'order_amount_mismatch';
  end if;

  if v_order.status not in ('pending', 'failed', 'paid') then
    raise exception 'order_status_invalid';
  end if;

  select * into v_order_item
  from public.order_items
  where order_id = p_order_id
  order by id
  limit 1;

  if not found or v_order_item.edition_id is null then
    raise exception 'order_item_not_configured';
  end if;

  select * into v_edition
  from public.product_editions
  where id = v_order_item.edition_id and product_id = v_order_item.product_id;

  if not found or not v_edition.active then
    raise exception 'edition_unavailable';
  end if;

  insert into public.customers (email, provider, provider_customer_id)
  values (p_customer_email, v_order.provider, p_provider_customer_id)
  on conflict (email) do update set
    provider = coalesce(excluded.provider, public.customers.provider),
    provider_customer_id = coalesce(excluded.provider_customer_id, public.customers.provider_customer_id),
    updated_at = now()
  returning id into v_customer_id;

  select id into v_entitlement_id
  from public.entitlements
  where order_item_id = v_order_item.id
  limit 1;

  if v_entitlement_id is not null then
    v_existing := true;
    select id into v_license_id
    from public.licenses
    where entitlement_id = v_entitlement_id;
  else
    insert into public.entitlements (
      customer_id, product_id, edition_id, order_item_id, status, version_policy, metadata
    ) values (
      v_customer_id, v_order_item.product_id, v_order_item.edition_id, v_order_item.id,
      'active', v_edition.version_policy, jsonb_build_object('source', v_order.provider)
    ) returning id into v_entitlement_id;

    if v_edition.activation_required then
      if p_license_key_prefix is null or p_license_key_hash is null or p_license_key_ciphertext is null then
        raise exception 'license_material_required';
      end if;

      insert into public.licenses (
        entitlement_id, customer_id, product_id, edition_id, key_prefix, key_hash,
        key_ciphertext, status, max_activations, metadata
      ) values (
        v_entitlement_id, v_customer_id, v_order_item.product_id, v_order_item.edition_id,
        p_license_key_prefix, p_license_key_hash, p_license_key_ciphertext,
        'active', v_edition.activation_limit, jsonb_build_object('source_order_id', p_order_id)
      ) returning id into v_license_id;
    end if;
  end if;

  insert into public.payments (
    order_id, customer_id, provider, provider_payment_id, provider_checkout_id,
    status, currency, amount_minor, completed_at
  ) values (
    p_order_id, v_customer_id, v_order.provider, p_provider_payment_id, p_provider_checkout_id,
    'succeeded', upper(p_currency), p_amount_minor, now()
  )
  on conflict (provider, provider_payment_id) do update set
    status = 'succeeded', customer_id = excluded.customer_id,
    provider_checkout_id = excluded.provider_checkout_id, completed_at = now(), updated_at = now();

  update public.orders set
    customer_id = v_customer_id,
    provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
    customer_email = p_customer_email,
    status = 'paid',
    completed_at = coalesce(completed_at, now())
  where id = p_order_id;

  insert into public.audit_logs (
    actor_type, action, target_type, target_id, metadata
  ) values (
    case when v_order.provider = 'stripe' then 'webhook' else 'service' end,
    'commerce.order_fulfilled', 'order', p_order_id::text,
    jsonb_build_object('entitlement_id', v_entitlement_id, 'license_id', v_license_id, 'already_fulfilled', v_existing)
  );

  return jsonb_build_object(
    'order_id', p_order_id,
    'customer_id', v_customer_id,
    'entitlement_id', v_entitlement_id,
    'license_id', v_license_id,
    'already_fulfilled', v_existing
  );
end;
$$;

revoke all on function public.claim_webhook_event(text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_webhook_event(text, text, text, text) to service_role;
revoke all on function public.fulfill_commerce_order(uuid, citext, text, text, text, text, integer, text, bytea, text) from public, anon, authenticated;
grant execute on function public.fulfill_commerce_order(uuid, citext, text, text, text, text, integer, text, bytea, text) to service_role;

insert into public.products (
  id, slug, name, eyebrow, tagline, description, status, license_model,
  pricing_label, purchase_available, support_lifecycle, published_at, metadata
) values (
  '44444444-4444-4444-8444-444444444444',
  'metatweak',
  'MetaTweak',
  'Windows metadata utility',
  'Inspect and edit file metadata with a focused Windows desktop workflow.',
  'MetaTweak provides clear tools for reviewing and changing document metadata, timestamps, file attributes, and advanced metadata workflows. Free and Pro capabilities are controlled by Driftline platform entitlements.',
  'available',
  'Free edition and perpetual Pro license',
  'Free or $14.99 one-time',
  true,
  'Active releases receive compatibility, licensing, and product support updates.',
  now(),
  jsonb_build_object('canonical_product_id', 'metatweak')
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  eyebrow = excluded.eyebrow,
  tagline = excluded.tagline,
  description = excluded.description,
  status = excluded.status,
  license_model = excluded.license_model,
  pricing_label = excluded.pricing_label,
  purchase_available = excluded.purchase_available,
  support_lifecycle = excluded.support_lifecycle,
  published_at = excluded.published_at,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.product_editions (
  id, product_id, code, name, description, license_type, activation_required,
  activation_limit, version_policy, refresh_interval_days, active, sort_order
) values
(
  '44444444-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444',
  'free', 'Free', 'Core metadata and file property tools at no cost.',
  'perpetual', false, 0, 'all_versions', 3650, true, 1
),
(
  '44444444-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444',
  'pro', 'Pro', 'The complete MetaTweak feature set with a perpetual license.',
  'perpetual', true, 3, 'all_versions', 30, true, 2
)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  description = excluded.description,
  license_type = excluded.license_type,
  activation_required = excluded.activation_required,
  activation_limit = excluded.activation_limit,
  version_policy = excluded.version_policy,
  refresh_interval_days = excluded.refresh_interval_days,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.features (id, product_id, feature_key, name, description) values
('44444444-1000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'document_metadata', 'Document metadata', 'Read and edit core document metadata.'),
('44444444-1000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'advanced_metadata', 'Advanced metadata', 'Access advanced metadata fields and operations.'),
('44444444-1000-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444', 'all_file_types', 'All supported file types', 'Use every file type supported by MetaTweak.'),
('44444444-1000-4000-8000-000000000004', '44444444-4444-4444-8444-444444444444', 'file_attributes', 'File attributes', 'Inspect and change supported file attributes.'),
('44444444-1000-4000-8000-000000000005', '44444444-4444-4444-8444-444444444444', 'datetime_editing', 'Date and time editing', 'Review and edit supported file timestamps.'),
('44444444-1000-4000-8000-000000000006', '44444444-4444-4444-8444-444444444444', 'backup_controls', 'Backup controls', 'Control safety backups before applying changes.'),
('44444444-1000-4000-8000-000000000007', '44444444-4444-4444-8444-444444444444', 'backup_auto_cleanup', 'Automatic backup cleanup', 'Automatically manage old safety backups.'),
('44444444-1000-4000-8000-000000000008', '44444444-4444-4444-8444-444444444444', 'batch_editing', 'Batch editing', 'Apply supported changes across multiple files.'),
('44444444-1000-4000-8000-000000000009', '44444444-4444-4444-8444-444444444444', 'presets', 'Presets', 'Save and reuse common editing configurations.'),
('44444444-1000-4000-8000-000000000010', '44444444-4444-4444-8444-444444444444', 'advanced_operations', 'Advanced operations', 'Use advanced metadata and file operations.'),
('44444444-1000-4000-8000-000000000011', '44444444-4444-4444-8444-444444444444', 'explorer_integration', 'Explorer integration', 'Start supported workflows from Windows Explorer.')
on conflict (id) do update set
  feature_key = excluded.feature_key,
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into public.edition_features (edition_id, feature_id)
select '44444444-0000-4000-8000-000000000001', id
from public.features
where product_id = '44444444-4444-4444-8444-444444444444'
  and feature_key in ('document_metadata', 'file_attributes', 'datetime_editing', 'backup_controls')
on conflict (edition_id, feature_id) do update set value = excluded.value;

insert into public.edition_features (edition_id, feature_id)
select '44444444-0000-4000-8000-000000000002', id
from public.features
where product_id = '44444444-4444-4444-8444-444444444444'
on conflict (edition_id, feature_id) do update set value = excluded.value;

insert into public.product_prices (
  id, product_id, edition_id, provider, provider_product_id, provider_price_id,
  environment, is_default, currency, amount_minor, billing_interval, active, metadata
) values
(
  '44444444-2000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444',
  '44444444-0000-4000-8000-000000000001', 'internal', null, 'metatweak-free',
  'internal', true, 'USD', 0, 'one_time', true, jsonb_build_object('label', 'Free')
),
(
  '44444444-2000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444',
  '44444444-0000-4000-8000-000000000002', 'stripe', null, null,
  'test', true, 'USD', 1499, 'one_time', true,
  jsonb_build_object('configuration_status', 'requires_stripe_test_ids', 'label', 'Pro')
)
on conflict (id) do update set
  product_id = excluded.product_id,
  edition_id = excluded.edition_id,
  provider = excluded.provider,
  environment = excluded.environment,
  is_default = excluded.is_default,
  currency = excluded.currency,
  amount_minor = excluded.amount_minor,
  billing_interval = excluded.billing_interval,
  active = excluded.active,
  metadata = excluded.metadata;

insert into public.product_features (id, product_id, title, description, sort_order) values
('44000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'Focused metadata editing', 'Review and change supported document metadata from one clear workspace.', 1),
('44000000-0000-4000-8000-000000000002', '44444444-4444-4444-8444-444444444444', 'File properties and timestamps', 'Work with supported file attributes and date/time values.', 2),
('44000000-0000-4000-8000-000000000003', '44444444-4444-4444-8444-444444444444', 'Safe backup controls', 'Protect changes with configurable safety backups.', 3),
('44000000-0000-4000-8000-000000000004', '44444444-4444-4444-8444-444444444444', 'Pro batch workflows', 'Unlock batch editing, presets, advanced operations, and Explorer integration.', 4)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.product_platforms (id, product_id, platform, minimum_requirements, sort_order) values
('44000000-0000-4000-9000-000000000001', '44444444-4444-4444-8444-444444444444', 'Windows', 'Supported Windows versions and release-specific requirements are published with each MetaTweak release.', 1)
on conflict (id) do update set
  platform = excluded.platform,
  minimum_requirements = excluded.minimum_requirements,
  sort_order = excluded.sort_order;

commit;
