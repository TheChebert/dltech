begin;

insert into public.products (
  id,
  slug,
  product_code,
  name,
  eyebrow,
  tagline,
  description,
  status,
  license_protocol_version,
  license_model,
  pricing_label,
  purchase_available,
  support_lifecycle,
  published_at
)
values (
  '44444444-4444-4444-8444-444444444444',
  'metatweak',
  'MT',
  'MetaTweak',
  'Driftline desktop software',
  'A focused Driftline application with Free and Pro editions backed by the shared licensing platform.',
  'MetaTweak is the first Driftline application registered against the canonical application licensing protocol. Release details and product capabilities are managed independently from the licensing contract.',
  'private_beta',
  1,
  'Free edition with no activation; Pro is a perpetual major-version license with up to three active installations.',
  'Free; Pro pricing is tentatively $14.99 one time.',
  false,
  'Release support is defined in MetaTweak version metadata.',
  '2026-09-01T00:00:00Z'
)
on conflict (id) do update set
  slug = excluded.slug,
  product_code = excluded.product_code,
  name = excluded.name,
  eyebrow = excluded.eyebrow,
  tagline = excluded.tagline,
  description = excluded.description,
  status = excluded.status,
  license_protocol_version = excluded.license_protocol_version,
  license_model = excluded.license_model,
  pricing_label = excluded.pricing_label,
  purchase_available = excluded.purchase_available,
  support_lifecycle = excluded.support_lifecycle,
  published_at = excluded.published_at,
  updated_at = now();

insert into public.product_features(id, product_id, feature_key, title, description, sort_order)
values
(
  '44000000-0000-4000-8100-000000000001',
  '44444444-4444-4444-8444-444444444444',
  'core',
  'MetaTweak Core',
  'The capability set available in MetaTweak Free.',
  1
),
(
  '44000000-0000-4000-8100-000000000002',
  '44444444-4444-4444-8444-444444444444',
  'pro',
  'MetaTweak Pro',
  'The additional capability set enabled by a MetaTweak Pro entitlement.',
  2
)
on conflict (id) do update set
  feature_key = excluded.feature_key,
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.product_platforms(id, product_id, platform_key, platform, minimum_requirements, sort_order)
values (
  '44000000-0000-4000-8200-000000000001',
  '44444444-4444-4444-8444-444444444444',
  'desktop',
  'Desktop',
  'Supported operating systems are declared by each published MetaTweak release.',
  1
)
on conflict (id) do update set
  platform_key = excluded.platform_key,
  platform = excluded.platform,
  minimum_requirements = excluded.minimum_requirements,
  sort_order = excluded.sort_order;

insert into public.product_editions (
  id,
  product_id,
  slug,
  name,
  description,
  license_type,
  activation_required,
  account_required,
  default_activation_limit,
  default_version_scope,
  default_major_version,
  refresh_interval_days,
  offline_grace_days,
  is_default,
  status
)
values
(
  '44000000-0000-4000-8300-000000000001',
  '44444444-4444-4444-8444-444444444444',
  'free',
  'Free',
  'No activation, account, or network connection is required.',
  'free',
  false,
  false,
  0,
  'all_versions',
  null,
  30,
  14,
  true,
  'active'
),
(
  '44000000-0000-4000-8300-000000000002',
  '44444444-4444-4444-8444-444444444444',
  'pro',
  'Pro',
  'A perpetual license for one major version with up to three active installations.',
  'perpetual',
  true,
  false,
  3,
  'major',
  1,
  30,
  14,
  false,
  'active'
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  license_type = excluded.license_type,
  activation_required = excluded.activation_required,
  account_required = excluded.account_required,
  default_activation_limit = excluded.default_activation_limit,
  default_version_scope = excluded.default_version_scope,
  default_major_version = excluded.default_major_version,
  refresh_interval_days = excluded.refresh_interval_days,
  offline_grace_days = excluded.offline_grace_days,
  is_default = excluded.is_default,
  status = excluded.status,
  updated_at = now();

insert into public.edition_features(product_id, edition_id, feature_id)
values
('44444444-4444-4444-8444-444444444444', '44000000-0000-4000-8300-000000000001', '44000000-0000-4000-8100-000000000001'),
('44444444-4444-4444-8444-444444444444', '44000000-0000-4000-8300-000000000002', '44000000-0000-4000-8100-000000000001'),
('44444444-4444-4444-8444-444444444444', '44000000-0000-4000-8300-000000000002', '44000000-0000-4000-8100-000000000002')
on conflict do nothing;

insert into public.product_prices (
  id,
  product_id,
  edition_id,
  provider,
  provider_price_id,
  currency,
  amount_minor,
  billing_interval,
  active,
  metadata
)
values (
  '44000000-0000-4000-8400-000000000001',
  '44444444-4444-4444-8444-444444444444',
  '44000000-0000-4000-8300-000000000002',
  'internal',
  'metatweak-pro-usd-one-time-v1',
  'USD',
  1499,
  'one_time',
  false,
  '{"approval_status":"tentative"}'::jsonb
)
on conflict (id) do update set
  edition_id = excluded.edition_id,
  currency = excluded.currency,
  amount_minor = excluded.amount_minor,
  billing_interval = excluded.billing_interval,
  active = false,
  metadata = excluded.metadata;

commit;
