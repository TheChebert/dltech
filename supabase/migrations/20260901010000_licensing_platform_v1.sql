begin;

create type public.license_type as enum ('free', 'perpetual', 'subscription');
create type public.version_entitlement_scope as enum ('all_versions', 'major');
create type public.product_edition_status as enum ('draft', 'active', 'retired');
create type public.signing_key_status as enum ('active', 'retired', 'revoked');

alter table public.products
  add column product_code citext,
  add column license_protocol_version smallint not null default 1
    check (license_protocol_version between 1 and 32767);

update public.products
set product_code = case slug::text
  when 'ezebay-listing-manager' then 'EZ'
  when 'easy-file-editor' then 'EF'
  when 'viewsaic' then 'VS'
  else 'P' || upper(substr(replace(id::text, '-', ''), 1, 7))
end
where product_code is null;

alter table public.products
  alter column product_code set not null,
  add constraint products_product_code_format_check check (
    product_code::text = upper(product_code::text)
    and product_code::text ~ '^[A-Z0-9]{2,8}$'
  ),
  add constraint products_product_code_key unique (product_code);

alter table public.product_features add column feature_key citext;

with feature_keys as (
  select
    id,
    product_id,
    coalesce(
      nullif(regexp_replace(regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
      'feature'
    ) as base_key
  from public.product_features
), ranked as (
  select
    id,
    base_key,
    count(*) over (partition by product_id, base_key) as duplicate_count
  from feature_keys
)
update public.product_features as feature
set feature_key = case
  when ranked.duplicate_count = 1 then ranked.base_key
  else ranked.base_key || '-' || substr(feature.id::text, 1, 8)
end
from ranked
where ranked.id = feature.id;

alter table public.product_features
  alter column feature_key set not null,
  add constraint product_features_key_format_check check (feature_key::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint product_features_product_key_key unique (product_id, feature_key);

alter table public.product_platforms add column platform_key citext;

with platform_keys as (
  select
    id,
    product_id,
    coalesce(
      nullif(regexp_replace(regexp_replace(lower(platform), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''),
      'platform'
    ) as base_key
  from public.product_platforms
), ranked as (
  select
    id,
    base_key,
    count(*) over (partition by product_id, base_key) as duplicate_count
  from platform_keys
)
update public.product_platforms as platform
set platform_key = case
  when ranked.duplicate_count = 1 then ranked.base_key
  else ranked.base_key || '-' || substr(platform.id::text, 1, 8)
end
from ranked
where ranked.id = platform.id;

alter table public.product_platforms
  alter column platform_key set not null,
  add constraint product_platforms_key_format_check check (platform_key::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add constraint product_platforms_product_key_key unique (product_id, platform_key);

alter table public.product_versions
  add column major_version integer generated always as ((split_part(version, '.', 1))::integer) stored;

create table public.product_editions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug citext not null check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  license_type public.license_type not null,
  activation_required boolean not null,
  account_required boolean not null default false,
  default_activation_limit integer not null default 0 check (default_activation_limit between 0 and 1000),
  default_version_scope public.version_entitlement_scope not null default 'all_versions',
  default_major_version integer check (default_major_version is null or default_major_version > 0),
  refresh_interval_days integer not null default 30 check (refresh_interval_days between 1 and 365),
  offline_grace_days integer not null default 14 check (offline_grace_days between 0 and 90),
  is_default boolean not null default false,
  status public.product_edition_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, slug),
  check (
    (default_version_scope = 'all_versions' and default_major_version is null)
    or (default_version_scope = 'major' and default_major_version is not null)
  ),
  check (activation_required or default_activation_limit = 0)
);

create unique index product_editions_default_idx
  on public.product_editions(product_id)
  where is_default and status = 'active';

create table public.edition_features (
  edition_id uuid not null references public.product_editions(id) on delete cascade,
  feature_id uuid not null references public.product_features(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (edition_id, feature_id)
);

insert into public.product_editions (
  product_id,
  slug,
  name,
  description,
  license_type,
  activation_required,
  account_required,
  default_activation_limit,
  default_version_scope,
  is_default,
  status
)
select
  id,
  'standard',
  'Standard',
  'Compatibility edition for the preliminary product registry.',
  'perpetual',
  true,
  true,
  1,
  'all_versions',
  false,
  'draft'
from public.products
on conflict (product_id, slug) do nothing;

alter table public.product_prices
  add column edition_id uuid references public.product_editions(id) on delete restrict;

create index product_prices_edition_active_idx
  on public.product_prices(edition_id, currency, billing_interval)
  where active;

alter table public.entitlements
  alter column user_id drop not null,
  add column customer_email citext,
  add column edition_id uuid references public.product_editions(id) on delete restrict,
  add column license_type public.license_type not null default 'perpetual',
  add column activation_limit integer not null default 1 check (activation_limit between 0 and 1000),
  add column version_scope public.version_entitlement_scope not null default 'all_versions',
  add column major_version integer check (major_version is null or major_version > 0),
  add column source text not null default 'migration' check (source in ('order', 'admin', 'migration', 'promotion'));

update public.entitlements as entitlement
set
  edition_id = edition.id,
  activation_limit = coalesce(license.max_activations, 1),
  version_scope = case when entitlement.version_policy ~ '^major:[0-9]+$' then 'major'::public.version_entitlement_scope else 'all_versions'::public.version_entitlement_scope end,
  major_version = case when entitlement.version_policy ~ '^major:[0-9]+$' then split_part(entitlement.version_policy, ':', 2)::integer else null end
from public.product_editions as edition
left join public.licenses as license on license.entitlement_id = entitlement.id
where edition.product_id = entitlement.product_id
  and edition.slug = 'standard'
  and entitlement.edition_id is null;

alter table public.entitlements
  alter column edition_id set not null,
  add constraint entitlements_owner_check check (user_id is not null or customer_email is not null),
  add constraint entitlements_version_scope_check check (
    (version_scope = 'all_versions' and major_version is null)
    or (version_scope = 'major' and major_version is not null)
  );

drop index public.entitlements_active_unique_idx;
create unique index entitlements_active_user_edition_idx
  on public.entitlements(user_id, edition_id)
  where status = 'active' and user_id is not null;
create index entitlements_email_product_idx
  on public.entitlements(customer_email, product_id, status)
  where customer_email is not null;

create table public.entitlement_features (
  entitlement_id uuid not null references public.entitlements(id) on delete cascade,
  feature_id uuid not null references public.product_features(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (entitlement_id, feature_id)
);

insert into public.entitlement_features(entitlement_id, feature_id)
select entitlement.id, edition_feature.feature_id
from public.entitlements as entitlement
join public.edition_features as edition_feature on edition_feature.edition_id = entitlement.edition_id
on conflict do nothing;

alter table public.licenses
  alter column user_id drop not null,
  add column key_version smallint not null default 1 check (key_version between 1 and 32767),
  add column key_suffix text,
  add column last_status_changed_at timestamptz not null default now(),
  add constraint licenses_key_hash_length_check check (octet_length(key_hash) = 32),
  add constraint licenses_expiry_check check (expires_at is null or expires_at > issued_at);

update public.licenses
set key_suffix = upper(substr(encode(key_hash, 'hex'), 61, 4))
where key_suffix is null;

update public.licenses as license
set max_activations = entitlement.activation_limit
from public.entitlements as entitlement
where entitlement.id = license.entitlement_id;

alter table public.licenses
  alter column key_suffix set not null,
  add constraint licenses_key_suffix_format_check check (key_suffix ~ '^[A-Z0-9]{4}$');

create index licenses_key_prefix_lookup_idx on public.licenses(key_prefix, key_suffix);

alter table public.application_installations
  rename column device_fingerprint_hash to installation_id_hash;

alter table public.application_installations
  alter column user_id drop not null,
  add constraint installations_hash_length_check check (octet_length(installation_id_hash) = 32);

alter table public.license_activations
  rename column activated_at to first_activated_at;

alter table public.license_activations
  add column last_activated_at timestamptz not null default now(),
  add column activation_count integer not null default 1 check (activation_count > 0),
  add column updated_at timestamptz not null default now(),
  add constraint activation_token_hash_length_check check (octet_length(activation_token_hash) = 32);

update public.license_activations
set last_activated_at = first_activated_at;

create table public.license_signing_keys (
  key_id text primary key check (key_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  algorithm text not null default 'Ed25519' check (algorithm = 'Ed25519'),
  public_key_spki text not null check (public_key_spki ~ '^[A-Za-z0-9_-]+$'),
  status public.signing_key_status not null default 'active',
  not_before timestamptz not null default now(),
  not_after timestamptz,
  created_at timestamptz not null default now(),
  check (not_after is null or not_after > not_before)
);

create unique index license_signing_keys_one_active_idx
  on public.license_signing_keys((status))
  where status = 'active';

insert into public.license_signing_keys(key_id, public_key_spki, status, not_before)
values (
  'driftline-license-2026-01',
  'MCowBQYDK2VwAyEArTbp1_u8GxtU2Y9J4wo5iYPucWs2SORZS4z8psXH9Fk',
  'active',
  '2026-09-01T00:00:00Z'
);

create table public.license_issuance_requests (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 200),
  request_hash bytea not null check (octet_length(request_hash) = 32),
  order_item_id uuid references public.order_items(id) on delete set null,
  license_id uuid not null unique references public.licenses(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index license_issuance_order_item_idx
  on public.license_issuance_requests(order_item_id)
  where order_item_id is not null;

create or replace function public.license_state_v1(
  p_license_id uuid,
  p_product_slug text,
  p_installation_id_hash bytea,
  p_activation_token_hash bytea,
  p_app_version text,
  p_touch boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state record;
  v_features jsonb;
  v_now timestamptz := now();
begin
  select
    license.id as license_id,
    license.status as license_status,
    license.expires_at as license_expires_at,
    license.max_activations,
    entitlement.id as entitlement_id,
    entitlement.status as entitlement_status,
    entitlement.ends_at as entitlement_expires_at,
    entitlement.license_type,
    entitlement.version_scope,
    entitlement.major_version,
    entitlement.activation_limit,
    product.id as product_id,
    product.slug::text as product_slug,
    edition.slug::text as edition_slug,
    edition.refresh_interval_days,
    edition.offline_grace_days,
    activation.id as activation_id,
    activation.installation_id,
    installation.revoked_at as installation_revoked_at
  into v_state
  from public.license_activations as activation
  join public.application_installations as installation on installation.id = activation.installation_id
  join public.licenses as license on license.id = activation.license_id
  join public.entitlements as entitlement on entitlement.id = license.entitlement_id
  join public.products as product on product.id = license.product_id
  join public.product_editions as edition on edition.id = entitlement.edition_id
  where license.id = p_license_id
    and product.slug = p_product_slug
    and installation.product_id = product.id
    and installation.installation_id_hash = p_installation_id_hash
    and activation.activation_token_hash = p_activation_token_hash
    and activation.deactivated_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_activation');
  end if;

  if v_state.installation_revoked_at is not null then
    return jsonb_build_object('ok', false, 'code', 'installation_revoked');
  end if;

  if v_state.license_status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'license_' || v_state.license_status::text);
  end if;

  if v_state.license_expires_at is not null and v_state.license_expires_at <= v_now then
    update public.licenses set status = 'expired', last_status_changed_at = v_now where id = v_state.license_id;
    return jsonb_build_object('ok', false, 'code', 'license_expired');
  end if;

  if v_state.entitlement_status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'entitlement_' || v_state.entitlement_status::text);
  end if;

  if v_state.entitlement_expires_at is not null and v_state.entitlement_expires_at <= v_now then
    update public.entitlements set status = 'expired' where id = v_state.entitlement_id;
    return jsonb_build_object('ok', false, 'code', 'entitlement_expired');
  end if;

  if p_touch then
    update public.license_activations
    set last_validated_at = v_now, updated_at = v_now
    where id = v_state.activation_id;

    update public.application_installations
    set last_seen_at = v_now, app_version = p_app_version
    where id = v_state.installation_id;

    update public.licenses
    set last_validated_at = v_now
    where id = v_state.license_id;
  end if;

  select coalesce(jsonb_agg(feature.feature_key::text order by feature.feature_key::text), '[]'::jsonb)
  into v_features
  from public.entitlement_features as entitlement_feature
  join public.product_features as feature on feature.id = entitlement_feature.feature_id
  where entitlement_feature.entitlement_id = v_state.entitlement_id;

  return jsonb_build_object(
    'ok', true,
    'license_id', v_state.license_id,
    'product_id', v_state.product_id,
    'product_slug', v_state.product_slug,
    'edition_slug', v_state.edition_slug,
    'license_type', v_state.license_type,
    'features', v_features,
    'version_scope', v_state.version_scope,
    'major_version', v_state.major_version,
    'activation_limit', v_state.activation_limit,
    'license_expires_at', v_state.license_expires_at,
    'entitlement_expires_at', v_state.entitlement_expires_at,
    'refresh_interval_days', v_state.refresh_interval_days,
    'offline_grace_days', v_state.offline_grace_days,
    'validated_at', v_now
  );
end;
$$;

create or replace function public.activate_license_v1(
  p_license_key_hash bytea,
  p_product_slug text,
  p_installation_id_hash bytea,
  p_activation_token_hash bytea,
  p_platform text,
  p_app_version text,
  p_device_name text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_license record;
  v_installation record;
  v_activation public.license_activations%rowtype;
  v_active_count integer;
  v_now timestamptz := now();
  v_result jsonb;
begin
  select
    license.id as license_id,
    license.user_id,
    license.product_id,
    license.status as license_status,
    license.expires_at as license_expires_at,
    license.max_activations,
    entitlement.id as entitlement_id,
    entitlement.status as entitlement_status,
    entitlement.starts_at,
    entitlement.ends_at,
    product.slug::text as product_slug
  into v_license
  from public.licenses as license
  join public.entitlements as entitlement on entitlement.id = license.entitlement_id
  join public.products as product on product.id = license.product_id
  where license.key_hash = p_license_key_hash
  for update of license;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_license');
  end if;

  if v_license.product_slug <> p_product_slug then
    return jsonb_build_object('ok', false, 'code', 'wrong_product');
  end if;

  if v_license.license_status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'license_' || v_license.license_status::text);
  end if;

  if v_license.license_expires_at is not null and v_license.license_expires_at <= v_now then
    update public.licenses set status = 'expired', last_status_changed_at = v_now where id = v_license.license_id;
    return jsonb_build_object('ok', false, 'code', 'license_expired');
  end if;

  if v_license.entitlement_status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'entitlement_' || v_license.entitlement_status::text);
  end if;

  if v_license.starts_at > v_now then
    return jsonb_build_object('ok', false, 'code', 'entitlement_not_started');
  end if;

  if v_license.ends_at is not null and v_license.ends_at <= v_now then
    update public.entitlements set status = 'expired' where id = v_license.entitlement_id;
    return jsonb_build_object('ok', false, 'code', 'entitlement_expired');
  end if;

  insert into public.application_installations (
    user_id,
    product_id,
    installation_id_hash,
    device_name,
    platform,
    app_version,
    first_seen_at,
    last_seen_at
  )
  values (
    v_license.user_id,
    v_license.product_id,
    p_installation_id_hash,
    p_device_name,
    p_platform,
    p_app_version,
    v_now,
    v_now
  )
  on conflict (product_id, installation_id_hash) do update
  set
    device_name = excluded.device_name,
    platform = excluded.platform,
    app_version = excluded.app_version,
    last_seen_at = excluded.last_seen_at
  returning id, user_id, revoked_at into v_installation;

  if v_installation.revoked_at is not null then
    return jsonb_build_object('ok', false, 'code', 'installation_revoked');
  end if;

  if v_installation.user_id is not null
    and v_license.user_id is not null
    and v_installation.user_id <> v_license.user_id then
    return jsonb_build_object('ok', false, 'code', 'installation_conflict');
  end if;

  select * into v_activation
  from public.license_activations
  where license_id = v_license.license_id
    and installation_id = v_installation.id
  for update;

  if found and v_activation.deactivated_at is null then
    update public.license_activations
    set
      activation_token_hash = p_activation_token_hash,
      last_validated_at = v_now,
      device_name = p_device_name,
      platform = p_platform,
      updated_at = v_now
    where id = v_activation.id;
  else
    select count(*) into v_active_count
    from public.license_activations
    where license_id = v_license.license_id
      and deactivated_at is null;

    if v_active_count >= v_license.max_activations then
      return jsonb_build_object('ok', false, 'code', 'activation_limit_reached');
    end if;

    if found then
      update public.license_activations
      set
        activation_token_hash = p_activation_token_hash,
        last_activated_at = v_now,
        activation_count = activation_count + 1,
        last_validated_at = v_now,
        deactivated_at = null,
        deactivation_reason = null,
        device_name = p_device_name,
        platform = p_platform,
        updated_at = v_now
      where id = v_activation.id;
    else
      insert into public.license_activations (
        license_id,
        installation_id,
        activation_token_hash,
        first_activated_at,
        last_activated_at,
        last_validated_at,
        device_name,
        platform
      ) values (
        v_license.license_id,
        v_installation.id,
        p_activation_token_hash,
        v_now,
        v_now,
        v_now,
        p_device_name,
        p_platform
      );
    end if;
  end if;

  update public.licenses set last_validated_at = v_now where id = v_license.license_id;

  insert into public.audit_logs(actor_type, action, target_type, target_id, request_id, metadata)
  values (
    'service',
    'license.activated',
    'license',
    v_license.license_id::text,
    p_request_id,
    jsonb_build_object('installation_id', v_installation.id)
  );

  v_result := public.license_state_v1(
    v_license.license_id,
    p_product_slug,
    p_installation_id_hash,
    p_activation_token_hash,
    p_app_version,
    false
  );

  return v_result;
end;
$$;

create or replace function public.validate_license_v1(
  p_license_id uuid,
  p_product_slug text,
  p_installation_id_hash bytea,
  p_activation_token_hash bytea,
  p_app_version text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.license_state_v1(
    p_license_id,
    p_product_slug,
    p_installation_id_hash,
    p_activation_token_hash,
    p_app_version,
    true
  );
end;
$$;

create or replace function public.refresh_license_v1(
  p_license_id uuid,
  p_product_slug text,
  p_installation_id_hash bytea,
  p_activation_token_hash bytea,
  p_new_activation_token_hash bytea,
  p_app_version text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  v_result := public.license_state_v1(
    p_license_id,
    p_product_slug,
    p_installation_id_hash,
    p_activation_token_hash,
    p_app_version,
    true
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is false then
    return v_result;
  end if;

  update public.license_activations as activation
  set activation_token_hash = p_new_activation_token_hash, updated_at = now()
  from public.application_installations as installation
  where activation.license_id = p_license_id
    and activation.installation_id = installation.id
    and activation.activation_token_hash = p_activation_token_hash
    and activation.deactivated_at is null
    and installation.installation_id_hash = p_installation_id_hash;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_activation');
  end if;

  insert into public.audit_logs(actor_type, action, target_type, target_id, request_id)
  values ('service', 'license.refreshed', 'license', p_license_id::text, p_request_id);

  return public.license_state_v1(
    p_license_id,
    p_product_slug,
    p_installation_id_hash,
    p_new_activation_token_hash,
    p_app_version,
    false
  );
end;
$$;

create or replace function public.deactivate_license_v1(
  p_license_id uuid,
  p_product_slug text,
  p_installation_id_hash bytea,
  p_activation_token_hash bytea,
  p_revoked_token_hash bytea,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activation record;
  v_now timestamptz := now();
begin
  select activation.id, activation.installation_id
  into v_activation
  from public.license_activations as activation
  join public.application_installations as installation on installation.id = activation.installation_id
  join public.licenses as license on license.id = activation.license_id
  join public.products as product on product.id = license.product_id
  where license.id = p_license_id
    and product.slug = p_product_slug
    and installation.installation_id_hash = p_installation_id_hash
    and activation.activation_token_hash = p_activation_token_hash
    and activation.deactivated_at is null
  for update of activation;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_activation');
  end if;

  update public.license_activations
  set
    activation_token_hash = p_revoked_token_hash,
    deactivated_at = v_now,
    deactivation_reason = left(coalesce(nullif(p_reason, ''), 'user_requested'), 240),
    updated_at = v_now
  where id = v_activation.id;

  insert into public.audit_logs(actor_type, action, target_type, target_id, request_id, metadata)
  values (
    'service',
    'license.deactivated',
    'license',
    p_license_id::text,
    p_request_id,
    jsonb_build_object('installation_id', v_activation.installation_id)
  );

  return jsonb_build_object('ok', true, 'deactivated_at', v_now);
end;
$$;

create or replace function public.issue_license_v1(
  p_idempotency_key text,
  p_request_hash bytea,
  p_product_slug text,
  p_edition_slug text,
  p_user_id uuid,
  p_customer_email text,
  p_order_item_id uuid,
  p_key_prefix text,
  p_key_suffix text,
  p_key_hash bytea,
  p_expires_at timestamptz,
  p_major_version integer,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.license_issuance_requests%rowtype;
  v_edition record;
  v_entitlement_id uuid;
  v_license_id uuid;
  v_major_version integer;
begin
  if p_user_id is null and nullif(trim(p_customer_email), '') is null then
    return jsonb_build_object('ok', false, 'code', 'owner_required');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select * into v_existing
  from public.license_issuance_requests
  where idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.request_hash <> p_request_hash then
      return jsonb_build_object('ok', false, 'code', 'idempotency_conflict');
    end if;
    return jsonb_build_object('ok', true, 'created', false, 'license_id', v_existing.license_id);
  end if;

  select
    product.id as product_id,
    edition.id as edition_id,
    edition.license_type,
    edition.default_activation_limit,
    edition.default_version_scope,
    edition.default_major_version,
    edition.activation_required
  into v_edition
  from public.products as product
  join public.product_editions as edition on edition.product_id = product.id
  where product.slug = p_product_slug
    and edition.slug = p_edition_slug
    and edition.status = 'active'
  for share of product, edition;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'edition_not_found');
  end if;

  if v_edition.license_type = 'free' or not v_edition.activation_required then
    return jsonb_build_object('ok', false, 'code', 'license_not_required');
  end if;

  v_major_version := case
    when v_edition.default_version_scope = 'major' then coalesce(p_major_version, v_edition.default_major_version)
    else null
  end;

  if v_edition.default_version_scope = 'major' and v_major_version is null then
    return jsonb_build_object('ok', false, 'code', 'major_version_required');
  end if;

  insert into public.entitlements (
    user_id,
    customer_email,
    product_id,
    edition_id,
    order_item_id,
    status,
    license_type,
    activation_limit,
    version_scope,
    major_version,
    version_policy,
    starts_at,
    ends_at,
    source
  ) values (
    p_user_id,
    nullif(trim(p_customer_email), '')::citext,
    v_edition.product_id,
    v_edition.edition_id,
    p_order_item_id,
    'active',
    v_edition.license_type,
    v_edition.default_activation_limit,
    v_edition.default_version_scope,
    v_major_version,
    case when v_edition.default_version_scope = 'major' then 'major:' || v_major_version::text else 'all_versions' end,
    now(),
    p_expires_at,
    case when p_order_item_id is null then 'admin' else 'order' end
  ) returning id into v_entitlement_id;

  insert into public.entitlement_features(entitlement_id, feature_id)
  select v_entitlement_id, feature_id
  from public.edition_features
  where edition_id = v_edition.edition_id;

  insert into public.licenses (
    entitlement_id,
    user_id,
    product_id,
    key_prefix,
    key_suffix,
    key_hash,
    status,
    max_activations,
    expires_at,
    last_status_changed_at
  ) values (
    v_entitlement_id,
    p_user_id,
    v_edition.product_id,
    p_key_prefix,
    p_key_suffix,
    p_key_hash,
    'active',
    v_edition.default_activation_limit,
    p_expires_at,
    now()
  ) returning id into v_license_id;

  insert into public.license_issuance_requests(
    idempotency_key,
    request_hash,
    order_item_id,
    license_id
  ) values (
    p_idempotency_key,
    p_request_hash,
    p_order_item_id,
    v_license_id
  );

  insert into public.audit_logs(actor_type, action, target_type, target_id, request_id, metadata)
  values (
    case when p_order_item_id is null then 'service' else 'webhook' end,
    'license.issued',
    'license',
    v_license_id::text,
    p_request_id,
    jsonb_build_object('product_slug', p_product_slug, 'edition_slug', p_edition_slug)
  );

  return jsonb_build_object('ok', true, 'created', true, 'license_id', v_license_id);
end;
$$;

create or replace function public.consume_request_nonce_v1(
  p_scope text,
  p_nonce_hash bytea,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.request_nonces where expires_at < now() - interval '1 hour';

  insert into public.request_nonces(scope, nonce_hash, expires_at, consumed_at)
  values (p_scope, p_nonce_hash, p_expires_at, now());

  return true;
exception when unique_violation then
  return false;
end;
$$;

create or replace function public.claim_webhook_event_v1(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.webhook_events%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_provider_event_id, 0));

  select * into v_event
  from public.webhook_events
  where provider = p_provider and provider_event_id = p_provider_event_id
  for update;

  if found then
    if v_event.payload_sha256 <> p_payload_sha256 then
      return jsonb_build_object('ok', false, 'code', 'webhook_payload_conflict');
    end if;
    if v_event.status in ('processed', 'processing', 'ignored') then
      return jsonb_build_object('ok', true, 'claimed', false, 'event_id', v_event.id, 'status', v_event.status);
    end if;

    update public.webhook_events
    set status = 'processing', attempts = attempts + 1, last_error = null
    where id = v_event.id;
    return jsonb_build_object('ok', true, 'claimed', true, 'event_id', v_event.id, 'status', 'processing');
  end if;

  insert into public.webhook_events(
    provider,
    provider_event_id,
    event_type,
    payload_sha256,
    status,
    attempts
  ) values (
    p_provider,
    p_provider_event_id,
    p_event_type,
    p_payload_sha256,
    'processing',
    1
  ) returning * into v_event;

  return jsonb_build_object('ok', true, 'claimed', true, 'event_id', v_event.id, 'status', 'processing');
end;
$$;

create or replace function public.complete_webhook_event_v1(
  p_event_id uuid,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('processed', 'failed', 'ignored') then
    return false;
  end if;

  update public.webhook_events
  set
    status = p_status,
    last_error = case when p_status = 'failed' then left(p_error, 2000) else null end,
    processed_at = case when p_status in ('processed', 'ignored') then now() else null end
  where id = p_event_id and status = 'processing';

  return found;
end;
$$;

create or replace function public.cleanup_security_state_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nonces integer;
  v_buckets integer;
begin
  delete from public.request_nonces where expires_at < now() - interval '1 hour';
  get diagnostics v_nonces = row_count;

  delete from public.rate_limit_buckets where updated_at < now() - interval '2 days';
  get diagnostics v_buckets = row_count;

  return jsonb_build_object('request_nonces', v_nonces, 'rate_limit_buckets', v_buckets);
end;
$$;

create trigger product_editions_updated_at
before update on public.product_editions
for each row execute function public.set_updated_at();

create trigger license_activations_updated_at
before update on public.license_activations
for each row execute function public.set_updated_at();

alter table public.product_editions enable row level security;
alter table public.edition_features enable row level security;
alter table public.entitlement_features enable row level security;
alter table public.license_signing_keys enable row level security;
alter table public.license_issuance_requests enable row level security;

create policy product_editions_public_read on public.product_editions
for select to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.products
    where products.id = product_editions.product_id
      and products.published_at is not null
      and products.status in ('planned', 'private_beta', 'available')
  )
);

create policy edition_features_public_read on public.edition_features
for select to anon, authenticated
using (
  exists (
    select 1
    from public.product_editions
    join public.products on products.id = product_editions.product_id
    where product_editions.id = edition_features.edition_id
      and product_editions.status = 'active'
      and products.published_at is not null
      and products.status in ('planned', 'private_beta', 'available')
  )
);

create policy entitlement_features_select_own on public.entitlement_features
for select to authenticated
using (
  exists (
    select 1 from public.entitlements
    where entitlements.id = entitlement_features.entitlement_id
      and (entitlements.user_id = (select auth.uid()) or public.is_admin())
  )
);

create policy signing_keys_public_read on public.license_signing_keys
for select to anon, authenticated
using (status in ('active', 'retired'));

create policy admins_manage_product_editions on public.product_editions
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_edition_features on public.edition_features
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_entitlement_features on public.entitlement_features
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_signing_keys on public.license_signing_keys
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_license_issuance on public.license_issuance_requests
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy product_prices_public_read on public.product_prices;
create policy product_prices_public_read on public.product_prices
for select to anon, authenticated
using (
  active
  and exists (
    select 1 from public.products
    where products.id = product_prices.product_id
      and products.published_at is not null
      and products.status in ('planned', 'private_beta', 'available')
  )
  and (
    edition_id is null
    or exists (
      select 1 from public.product_editions
      where product_editions.id = product_prices.edition_id
        and product_editions.status = 'active'
    )
  )
);

revoke all on public.product_editions, public.edition_features, public.entitlement_features,
  public.license_signing_keys, public.license_issuance_requests from anon, authenticated;

grant select on public.product_editions, public.edition_features, public.license_signing_keys to anon, authenticated;
grant select on public.entitlement_features to authenticated;
grant select, insert, update, delete on public.product_editions, public.edition_features,
  public.entitlement_features, public.license_signing_keys, public.license_issuance_requests to authenticated;

revoke all on function public.license_state_v1(uuid, text, bytea, bytea, text, boolean) from public, anon, authenticated;
revoke all on function public.activate_license_v1(bytea, text, bytea, bytea, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.validate_license_v1(uuid, text, bytea, bytea, text, uuid) from public, anon, authenticated;
revoke all on function public.refresh_license_v1(uuid, text, bytea, bytea, bytea, text, uuid) from public, anon, authenticated;
revoke all on function public.deactivate_license_v1(uuid, text, bytea, bytea, bytea, text, uuid) from public, anon, authenticated;
revoke all on function public.issue_license_v1(text, bytea, text, text, uuid, text, uuid, text, text, bytea, timestamptz, integer, uuid) from public, anon, authenticated;
revoke all on function public.consume_request_nonce_v1(text, bytea, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_webhook_event_v1(text, text, text, text) from public, anon, authenticated;
revoke all on function public.complete_webhook_event_v1(uuid, text, text) from public, anon, authenticated;
revoke all on function public.cleanup_security_state_v1() from public, anon, authenticated;

grant execute on function public.activate_license_v1(bytea, text, bytea, bytea, text, text, text, uuid) to service_role;
grant execute on function public.validate_license_v1(uuid, text, bytea, bytea, text, uuid) to service_role;
grant execute on function public.refresh_license_v1(uuid, text, bytea, bytea, bytea, text, uuid) to service_role;
grant execute on function public.deactivate_license_v1(uuid, text, bytea, bytea, bytea, text, uuid) to service_role;
grant execute on function public.issue_license_v1(text, bytea, text, text, uuid, text, uuid, text, text, bytea, timestamptz, integer, uuid) to service_role;
grant execute on function public.consume_request_nonce_v1(text, bytea, timestamptz) to service_role;
grant execute on function public.claim_webhook_event_v1(text, text, text, text) to service_role;
grant execute on function public.complete_webhook_event_v1(uuid, text, text) to service_role;
grant execute on function public.cleanup_security_state_v1() to service_role;

commit;
