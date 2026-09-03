begin;

do $$
declare
  v_product_id uuid;
  v_free_edition_id uuid;
  v_pro_edition_id uuid;
  v_order_id uuid := gen_random_uuid();
  v_order_item_id uuid;
  v_email citext := ('validation+' || gen_random_uuid()::text || '@example.invalid')::citext;
  v_key_hash bytea := digest(gen_random_uuid()::text, 'sha256');
  v_first jsonb;
  v_duplicate jsonb;
  v_license_id uuid;
  v_customer_id uuid;
  v_installation_id uuid;
  v_result text;
  v_index integer;
begin
  select id into v_product_id from public.products where slug = 'metatweak';
  select id into v_free_edition_id from public.product_editions where product_id = v_product_id and code = 'free';
  select id into v_pro_edition_id from public.product_editions where product_id = v_product_id and code = 'pro';

  if v_product_id is null or v_free_edition_id is null or v_pro_edition_id is null then
    raise exception 'MetaTweak product or editions are missing';
  end if;
  if not exists (
    select 1 from public.product_editions
    where id = v_free_edition_id and license_type = 'perpetual'
      and not activation_required and activation_limit = 0
  ) then raise exception 'Free edition configuration is invalid'; end if;
  if not exists (
    select 1 from public.product_editions
    where id = v_pro_edition_id and license_type = 'perpetual'
      and activation_required and activation_limit = 3
  ) then raise exception 'Pro edition configuration is invalid'; end if;
  if not exists (
    select 1 from public.product_prices
    where edition_id = v_free_edition_id and currency = 'USD' and amount_minor = 0
  ) then raise exception 'Free price configuration is invalid'; end if;
  if not exists (
    select 1 from public.product_prices
    where edition_id = v_pro_edition_id and provider = 'stripe' and environment = 'test'
      and currency = 'USD' and amount_minor = 1499 and billing_interval = 'one_time'
  ) then raise exception 'Pro price configuration is invalid'; end if;
  if (select count(*) from public.edition_features where edition_id = v_free_edition_id) <> 4 then
    raise exception 'Free feature grant count is invalid';
  end if;
  if (select count(*) from public.edition_features where edition_id = v_pro_edition_id) <> 11 then
    raise exception 'Pro feature grant count is invalid';
  end if;

  insert into public.orders (
    id, provider, provider_order_id, status, currency, subtotal_minor, total_minor, customer_email
  ) values (
    v_order_id, 'manual', 'validation:' || v_order_id::text, 'pending', 'USD', 0, 0, v_email
  );
  insert into public.order_items (
    order_id, product_id, edition_id, quantity, unit_amount_minor, total_amount_minor
  ) values (
    v_order_id, v_product_id, v_pro_edition_id, 1, 0, 0
  ) returning id into v_order_item_id;

  select public.fulfill_commerce_order(
    v_order_id, v_email, null, 'validation-payment:' || v_order_id::text, null,
    'USD', 0, 'DLT1_VALID', v_key_hash, 'v1.validation.ciphertext'
  ) into v_first;
  select public.fulfill_commerce_order(
    v_order_id, v_email, null, 'validation-payment:' || v_order_id::text, null,
    'USD', 0, 'DLT1_OTHER', digest('unused', 'sha256'), 'v1.unused.ciphertext'
  ) into v_duplicate;

  v_license_id := (v_first ->> 'license_id')::uuid;
  v_customer_id := (v_first ->> 'customer_id')::uuid;
  if v_license_id is null or (v_duplicate ->> 'license_id')::uuid <> v_license_id then
    raise exception 'Duplicate fulfillment changed license identity';
  end if;
  if (select count(*) from public.licenses where entitlement_id = (v_first ->> 'entitlement_id')::uuid) <> 1 then
    raise exception 'Duplicate fulfillment created more than one license';
  end if;

  for v_index in 1..4 loop
    insert into public.application_installations (
      customer_id, product_id, device_fingerprint_hash, platform, app_version
    ) values (
      v_customer_id, v_product_id, digest('validation-installation-' || v_index::text, 'sha256'), 'windows', '1.0.0'
    ) returning id into v_installation_id;
    select public.activate_license_installation(
      v_license_id, v_installation_id, digest('validation-token-' || v_index::text, 'sha256'),
      'Validation device ' || v_index::text, 'windows'
    ) into v_result;
    if v_index <= 3 and v_result <> 'activated' then
      raise exception 'Expected activation %, received %', v_index, v_result;
    end if;
    if v_index = 4 and v_result <> 'activation_limit_reached' then
      raise exception 'Fourth activation was not rejected: %', v_result;
    end if;
  end loop;

  update public.license_activations
  set deactivated_at = now(), activation_token_hash = digest('validation-revoked', 'sha256')
  where id = (
      select id from public.license_activations
      where license_id = v_license_id and deactivated_at is null
      order by activated_at, id limit 1
    );

  insert into public.application_installations (
    customer_id, product_id, device_fingerprint_hash, platform, app_version
  ) values (
    v_customer_id, v_product_id, digest('validation-replacement', 'sha256'), 'windows', '1.0.0'
  ) returning id into v_installation_id;
  select public.activate_license_installation(
    v_license_id, v_installation_id, digest('validation-replacement-token', 'sha256'),
    'Replacement device', 'windows'
  ) into v_result;
  if v_result <> 'activated' then
    raise exception 'Replacement activation failed: %', v_result;
  end if;
end;
$$;

rollback;
