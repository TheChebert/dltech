begin;

insert into public.products (
  id, slug, name, eyebrow, tagline, description, status, license_model,
  pricing_label, purchase_available, support_lifecycle, published_at
)
values
(
  '11111111-1111-4111-8111-111111111111',
  'ezebay-listing-manager',
  'EzeBay Listing Manager',
  'Marketplace workflow software',
  'A focused workspace for creating, reviewing, and managing marketplace listings with less repetitive work.',
  'EzeBay Listing Manager is being designed to help sellers prepare consistent listings, organize product information, and move through listing workflows with greater confidence. Product details and availability will be announced as development progresses.',
  'planned',
  'Commercial license model to be announced',
  'Pricing to be announced',
  false,
  'Support lifecycle will be published before release.',
  now()
),
(
  '22222222-2222-4222-8222-222222222222',
  'easy-file-editor',
  'Easy File Editor',
  'File productivity software',
  'A straightforward editing experience for common file tasks without unnecessary complexity.',
  'Easy File Editor is a planned Driftline product focused on making everyday file changes faster and easier to understand. The final feature set, platform support, and commercial terms are still in development.',
  'planned',
  'Commercial license model to be announced',
  'Pricing to be announced',
  false,
  'Support lifecycle will be published before release.',
  now()
),
(
  '33333333-3333-4333-8333-333333333333',
  'viewsaic',
  'Viewsaic',
  'Visual organization software',
  'A planned workspace for viewing, organizing, and sharing image collections more clearly.',
  'Viewsaic is an early product concept for people and teams who need a cleaner way to work with image collections. Product scope is provisional and will be refined before release.',
  'planned',
  'Commercial terms to be announced',
  'Pricing to be announced',
  false,
  'Support lifecycle will be published before release.',
  now()
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
  updated_at = now();

insert into public.product_features (id, product_id, title, sort_order)
values
('11000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Structured listing workspace', 1),
('11000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Reusable listing information', 2),
('11000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Review and validation workflow', 3),
('11000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Marketplace integration foundation', 4),
('11000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Release and entitlement support', 5),
('11000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Secure customer downloads', 6),
('22000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Focused editing workflows', 1),
('22000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Clear change review', 2),
('22000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Safe file handling foundation', 3),
('22000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Version-aware update checks', 4),
('22000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Account-based entitlements', 5),
('22000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Product documentation framework', 6),
('33000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Fast collection browsing', 1),
('33000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Flexible organization', 2),
('33000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 'Sharing and export foundation', 3),
('33000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', 'Private customer access', 4),
('33000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-333333333333', 'Secure release downloads', 5),
('33000000-0000-4000-8000-000000000006', '33333333-3333-4333-8333-333333333333', 'Version and support lifecycle tracking', 6)
on conflict (id) do update set title = excluded.title, sort_order = excluded.sort_order;

insert into public.product_platforms (id, product_id, platform, minimum_requirements, sort_order)
values
('11000000-0000-4000-9000-000000000001', '11111111-1111-4111-8111-111111111111', 'Windows planned', 'Final supported versions to be announced; internet connection for account and license services.', 1),
('22000000-0000-4000-9000-000000000001', '22222222-2222-4222-8222-222222222222', 'Desktop platforms under review', 'Final supported systems to be announced.', 1),
('33000000-0000-4000-9000-000000000001', '33333333-3333-4333-8333-333333333333', 'Platform support to be announced', 'Storage and sharing requirements are under review.', 1)
on conflict (id) do update set platform = excluded.platform, minimum_requirements = excluded.minimum_requirements, sort_order = excluded.sort_order;

insert into public.portfolio_projects (id, slug, title, project_type, summary, is_concept, is_published, published_at, sort_order)
values
('41000000-0000-4000-8000-000000000001', 'service-commerce-concept', 'Service commerce concept', 'Website & customer journey', 'An illustrative concept for a service business that needs clearer offers, scheduling, and customer follow-through.', true, true, now(), 1),
('41000000-0000-4000-8000-000000000002', 'operations-portal-concept', 'Operations portal concept', 'Custom web application', 'An illustrative portal concept that brings requests, status, documents, and reporting into one secure workspace.', true, true, now(), 2),
('41000000-0000-4000-8000-000000000003', 'connected-workflow-concept', 'Connected workflow concept', 'Automation & integration', 'An illustrative system that validates incoming work, synchronizes data, and provides a visible recovery queue.', true, true, now(), 3),
('41000000-0000-4000-8000-000000000004', 'product-launch-concept', 'Product launch concept', 'Software platform', 'An illustrative launch system spanning product pages, customer access, licenses, releases, and support content.', true, true, now(), 4)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  project_type = excluded.project_type,
  summary = excluded.summary,
  is_concept = true,
  is_published = true,
  published_at = excluded.published_at,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
