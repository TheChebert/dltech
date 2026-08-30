begin;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_features enable row level security;
alter table public.product_platforms enable row level security;
alter table public.product_versions enable row level security;
alter table public.download_assets enable row level security;
alter table public.product_prices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.entitlements enable row level security;
alter table public.licenses enable row level security;
alter table public.application_installations enable row level security;
alter table public.license_activations enable row level security;
alter table public.api_clients enable row level security;
alter table public.request_nonces enable row level security;
alter table public.webhook_events enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.support_articles enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid()) or public.is_admin())
with check (id = (select auth.uid()) or public.is_admin());

create policy products_public_read on public.products for select to anon, authenticated
using (published_at is not null and status in ('planned', 'private_beta', 'available'));

create policy product_features_public_read on public.product_features for select to anon, authenticated
using (exists (
  select 1 from public.products
  where products.id = product_features.product_id
    and products.published_at is not null
    and products.status in ('planned', 'private_beta', 'available')
));

create policy product_platforms_public_read on public.product_platforms for select to anon, authenticated
using (exists (
  select 1 from public.products
  where products.id = product_platforms.product_id
    and products.published_at is not null
    and products.status in ('planned', 'private_beta', 'available')
));

create policy product_versions_public_read on public.product_versions for select to anon, authenticated
using (
  is_published
  and published_at is not null
  and exists (
    select 1 from public.products
    where products.id = product_versions.product_id
      and products.published_at is not null
      and products.status in ('private_beta', 'available')
  )
);

create policy product_prices_public_read on public.product_prices for select to anon, authenticated
using (
  active
  and exists (
    select 1 from public.products
    where products.id = product_prices.product_id
      and products.published_at is not null
      and products.status in ('planned', 'private_beta', 'available')
  )
);

create policy support_articles_public_read on public.support_articles for select to anon, authenticated
using (is_published and published_at is not null);

create policy portfolio_projects_public_read on public.portfolio_projects for select to anon, authenticated
using (is_published and published_at is not null);

create policy orders_select_own on public.orders for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy order_items_select_own on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and (orders.user_id = (select auth.uid()) or public.is_admin())
  )
);

create policy entitlements_select_own on public.entitlements for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy licenses_select_own on public.licenses for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy installations_select_own on public.application_installations for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

create policy activations_select_own on public.license_activations for select to authenticated
using (
  exists (
    select 1 from public.licenses
    where licenses.id = license_activations.license_id
      and (licenses.user_id = (select auth.uid()) or public.is_admin())
  )
);

create policy tickets_select_own_or_staff on public.support_tickets for select to authenticated
using (user_id = (select auth.uid()) or public.is_support_or_admin());

create policy tickets_insert_own on public.support_tickets for insert to authenticated
with check (user_id = (select auth.uid()));

create policy messages_select_ticket on public.support_messages for select to authenticated
using (
  exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
      and (
        public.is_support_or_admin()
        or (support_tickets.user_id = (select auth.uid()) and not support_messages.is_internal)
      )
  )
);

create policy messages_insert_own on public.support_messages for insert to authenticated
with check (
  author_id = (select auth.uid())
  and not is_internal
  and exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
      and support_tickets.user_id = (select auth.uid())
  )
);

create policy admins_manage_profiles on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_products on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_product_features on public.product_features for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_product_platforms on public.product_platforms for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_product_versions on public.product_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_download_assets on public.download_assets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_product_prices on public.product_prices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_orders on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_order_items on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_entitlements on public.entitlements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_licenses on public.licenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_installations on public.application_installations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_activations on public.license_activations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_api_clients on public.api_clients for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_request_nonces on public.request_nonces for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_manage_webhook_events on public.webhook_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy staff_manage_contacts on public.contact_submissions for all to authenticated using (public.is_support_or_admin()) with check (public.is_support_or_admin());
create policy staff_manage_articles on public.support_articles for all to authenticated using (public.is_support_or_admin()) with check (public.is_support_or_admin());
create policy staff_manage_tickets on public.support_tickets for all to authenticated using (public.is_support_or_admin()) with check (public.is_support_or_admin());
create policy staff_manage_messages on public.support_messages for all to authenticated using (public.is_support_or_admin()) with check (public.is_support_or_admin());
create policy admins_manage_portfolio on public.portfolio_projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admins_read_api_logs on public.api_request_logs for select to authenticated using (public.is_admin());
create policy admins_read_audit_logs on public.audit_logs for select to authenticated using (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_features, public.product_platforms, public.product_versions, public.product_prices, public.support_articles, public.portfolio_projects to anon, authenticated;

grant select on public.profiles, public.orders, public.order_items, public.entitlements, public.licenses, public.application_installations, public.license_activations, public.support_tickets, public.support_messages to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert on public.support_tickets, public.support_messages to authenticated;

grant select, insert, update, delete on public.products, public.product_features, public.product_platforms, public.product_versions, public.download_assets, public.product_prices, public.orders, public.order_items, public.entitlements, public.licenses, public.application_installations, public.license_activations, public.api_clients, public.request_nonces, public.webhook_events, public.contact_submissions, public.support_articles, public.support_tickets, public.support_messages, public.portfolio_projects to authenticated;

grant select on public.api_request_logs, public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_support_or_admin() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-releases',
  'product-releases',
  false,
  1073741824,
  array[
    'application/octet-stream',
    'application/zip',
    'application/x-msdownload',
    'application/x-apple-diskimage',
    'application/vnd.microsoft.portable-executable'
  ]
)
on conflict (id) do update set public = false;

create policy admin_read_release_objects on storage.objects for select to authenticated
using (bucket_id = 'product-releases' and public.is_admin());

create policy admin_insert_release_objects on storage.objects for insert to authenticated
with check (bucket_id = 'product-releases' and public.is_admin());

create policy admin_update_release_objects on storage.objects for update to authenticated
using (bucket_id = 'product-releases' and public.is_admin())
with check (bucket_id = 'product-releases' and public.is_admin());

create policy admin_delete_release_objects on storage.objects for delete to authenticated
using (bucket_id = 'product-releases' and public.is_admin());

commit;
