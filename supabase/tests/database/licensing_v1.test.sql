begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(46);

create temporary table licensing_test_state (
  name text primary key,
  payload jsonb not null
) on commit drop;

select is((select license_type::text from product_editions where product_id = '44444444-4444-4444-8444-444444444444' and slug = 'free'), 'free', 'MetaTweak Free is a free edition');
select ok((select not activation_required and not account_required and default_activation_limit = 0 from product_editions where product_id = '44444444-4444-4444-8444-444444444444' and slug = 'free'), 'MetaTweak Free requires neither activation nor account');
select ok((select license_type = 'perpetual' and default_activation_limit = 3 and default_version_scope = 'major' from product_editions where product_id = '44444444-4444-4444-8444-444444444444' and slug = 'pro'), 'MetaTweak Pro is perpetual with three major-version activations');

insert into licensing_test_state values (
  'issued',
  issue_license_v1(
    'test-issuance-primary', decode(repeat('01', 32), 'hex'), 'metatweak', 'pro', null,
    'license-test@example.com', null, 'DL-MT-ABCD', 'WXYZ', decode(repeat('02', 32), 'hex'),
    null, 1, '10000000-0000-4000-8000-000000000001'
  )
);

select ok(((select payload from licensing_test_state where name = 'issued')->>'created')::boolean, 'first issuance creates a license');
select ok((select expires_at is null from licenses where id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid), 'perpetual license has no expiration');

insert into licensing_test_state values (
  'issuance_retry',
  issue_license_v1(
    'test-issuance-primary', decode(repeat('01', 32), 'hex'), 'metatweak', 'pro', null,
    'license-test@example.com', null, 'DL-MT-ABCD', 'WXYZ', decode(repeat('02', 32), 'hex'),
    null, 1, '10000000-0000-4000-8000-000000000002'
  )
);
select ok(not ((select payload from licensing_test_state where name = 'issuance_retry')->>'created')::boolean, 'duplicate issuance is idempotent');
select is((select payload->>'license_id' from licensing_test_state where name = 'issuance_retry'), (select payload->>'license_id' from licensing_test_state where name = 'issued'), 'idempotent issuance returns the same license');
select is(issue_license_v1('test-issuance-primary', decode(repeat('03', 32), 'hex'), 'metatweak', 'pro', null, 'license-test@example.com', null, 'DL-MT-ABCD', 'WXYZ', decode(repeat('02', 32), 'hex'), null, 1, gen_random_uuid())->>'code', 'idempotency_conflict', 'changed idempotent request is rejected');

select is(activate_license_v1(decode(repeat('99', 32), 'hex'), 'metatweak', decode(repeat('11', 32), 'hex'), decode(repeat('21', 32), 'hex'), 'desktop', '1.0.0', null, gen_random_uuid())->>'code', 'invalid_license', 'invalid license is rejected');
select is(activate_license_v1(decode(repeat('02', 32), 'hex'), 'viewsaic', decode(repeat('12', 32), 'hex'), decode(repeat('22', 32), 'hex'), 'desktop', '1.0.0', null, gen_random_uuid())->>'code', 'wrong_product', 'license cannot activate a different product');
select is((select count(*)::integer from application_installations where installation_id_hash = decode(repeat('12', 32), 'hex')), 0, 'failed wrong-product activation writes nothing');

insert into licensing_test_state values ('activate_1', activate_license_v1(decode(repeat('02', 32), 'hex'), 'metatweak', decode(repeat('31', 32), 'hex'), decode(repeat('41', 32), 'hex'), 'desktop', '1.0.0', 'one', gen_random_uuid()));
select ok(((select payload from licensing_test_state where name = 'activate_1')->>'ok')::boolean, 'first installation activates');
select ok((activate_license_v1(decode(repeat('02', 32), 'hex'), 'metatweak', decode(repeat('31', 32), 'hex'), decode(repeat('42', 32), 'hex'), 'desktop', '1.0.1', 'one', gen_random_uuid())->>'ok')::boolean, 'repeat activation rotates the token');
select is((select count(*)::integer from license_activations where license_id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid and deactivated_at is null), 1, 'repeat activation does not consume a slot');

select ok((activate_license_v1(decode(repeat('02', 32), 'hex'), 'metatweak', decode(repeat('32', 32), 'hex'), decode(repeat('43', 32), 'hex'), 'desktop', '1.0.0', 'two', gen_random_uuid())->>'ok')::boolean, 'second installation activates');
select ok((activate_license_v1(decode(repeat('02', 32), 'hex'), 'metatweak', decode(repeat('33', 32), 'hex'), decode(repeat('44', 32), 'hex'), 'desktop', '1.0.0', 'three', gen_random_uuid())->>'ok')::boolean, 'third installation activates');
select is(activate_license_v1(decode(repeat('02', 32), 'hex'), 'metatweak', decode(repeat('34', 32), 'hex'), decode(repeat('45', 32), 'hex'), 'desktop', '1.0.0', 'four', gen_random_uuid())->>'code', 'activation_limit_reached', 'fourth installation is rejected at the limit');
select is((select count(*)::integer from application_installations where installation_id_hash = decode(repeat('34', 32), 'hex')), 0, 'failed max-limit activation rolls back the new installation');
select is((select count(*)::integer from license_activations where license_id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid and deactivated_at is null), 3, 'activation invariant remains at three');

select ok((deactivate_license_v1(((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid, 'metatweak', decode(repeat('32', 32), 'hex'), decode(repeat('43', 32), 'hex'), decode(repeat('53', 32), 'hex'), 'test', gen_random_uuid())->>'ok')::boolean, 'installation deactivates');
select is((select count(*)::integer from license_activations where license_id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid and deactivated_at is null), 2, 'deactivation frees one slot');
select ok((activate_license_v1(decode(repeat('02', 32), 'hex'), 'metatweak', decode(repeat('32', 32), 'hex'), decode(repeat('46', 32), 'hex'), 'desktop', '1.0.0', 'two', gen_random_uuid())->>'ok')::boolean, 'deactivated installation can reactivate');
select is((select activation_count from license_activations join application_installations on application_installations.id = license_activations.installation_id where license_id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid and installation_id_hash = decode(repeat('32', 32), 'hex')), 2, 'reactivation count is audited');
select ok((deactivate_license_v1(((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid, 'metatweak', decode(repeat('32', 32), 'hex'), decode(repeat('46', 32), 'hex'), decode(repeat('54', 32), 'hex'), 'transfer', gen_random_uuid())->>'ok')::boolean, 'reactivated installation can deactivate again');
select ok((activate_license_v1(decode(repeat('02', 32), 'hex'), 'metatweak', decode(repeat('34', 32), 'hex'), decode(repeat('47', 32), 'hex'), 'desktop', '1.0.0', 'four', gen_random_uuid())->>'ok')::boolean, 'freed slot permits license transfer');
select is((select count(*)::integer from license_activations where license_id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid and deactivated_at is null), 3, 'transfer preserves the activation limit');

update licenses set status = 'revoked' where id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid;
select is(validate_license_v1(((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid, 'metatweak', decode(repeat('31', 32), 'hex'), decode(repeat('42', 32), 'hex'), '1.0.0', gen_random_uuid())->>'code', 'license_revoked', 'revoked license is rejected');
update licenses set status = 'suspended' where id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid;
select is(validate_license_v1(((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid, 'metatweak', decode(repeat('31', 32), 'hex'), decode(repeat('42', 32), 'hex'), '1.0.0', gen_random_uuid())->>'code', 'license_suspended', 'suspended license is rejected');
update licenses set status = 'active', issued_at = now() - interval '2 days', expires_at = now() - interval '1 day' where id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid;
select is(validate_license_v1(((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid, 'metatweak', decode(repeat('31', 32), 'hex'), decode(repeat('42', 32), 'hex'), '1.0.0', gen_random_uuid())->>'code', 'license_expired', 'expired license is rejected');
update licenses set status = 'active', issued_at = now(), expires_at = null where id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid;

update entitlements set status = 'suspended' where id = (select entitlement_id from licenses where id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid);
select is(validate_license_v1(((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid, 'metatweak', decode(repeat('31', 32), 'hex'), decode(repeat('42', 32), 'hex'), '1.0.0', gen_random_uuid())->>'code', 'entitlement_suspended', 'suspended entitlement is rejected');
update entitlements set status = 'active', starts_at = now() - interval '2 days', ends_at = now() - interval '1 day' where id = (select entitlement_id from licenses where id = ((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid);
select is(validate_license_v1(((select payload from licensing_test_state where name = 'issued')->>'license_id')::uuid, 'metatweak', decode(repeat('31', 32), 'hex'), decode(repeat('42', 32), 'hex'), '1.0.0', gen_random_uuid())->>'code', 'entitlement_expired', 'expired entitlement is rejected');

select ok(consume_request_nonce_v1('test:nonce', decode(repeat('61', 32), 'hex'), now() + interval '10 minutes'), 'first nonce is accepted');
select ok(not consume_request_nonce_v1('test:nonce', decode(repeat('61', 32), 'hex'), now() + interval '10 minutes'), 'replayed nonce is rejected');
select ok(consume_rate_limit('test:rate-limit', 60, 1), 'first rate-limited request is accepted');
select ok(not consume_rate_limit('test:rate-limit', 60, 1), 'request over rate limit is rejected');

insert into licensing_test_state values ('webhook', claim_webhook_event_v1('test-provider', 'event-1', 'order.paid', repeat('a', 64)));
select ok(((select payload from licensing_test_state where name = 'webhook')->>'claimed')::boolean, 'first webhook delivery is claimed');
select ok(not (claim_webhook_event_v1('test-provider', 'event-1', 'order.paid', repeat('a', 64))->>'claimed')::boolean, 'duplicate webhook delivery is not reprocessed');
select is(claim_webhook_event_v1('test-provider', 'event-1', 'order.paid', repeat('b', 64))->>'code', 'webhook_payload_conflict', 'duplicate webhook with changed payload is rejected');
select ok(complete_webhook_event_v1(((select payload from licensing_test_state where name = 'webhook')->>'event_id')::uuid, 'processed'), 'claimed webhook completes once');

insert into orders(id, provider, provider_order_id, currency, customer_email) values ('70000000-0000-4000-8000-000000000001', 'test-provider', 'order-1', 'USD', 'order-test@example.com');
insert into order_items(id, order_id, product_id, quantity, unit_amount_minor, total_amount_minor) values ('70000000-0000-4000-8100-000000000001', '70000000-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 1, 1499, 1499);
insert into licensing_test_state values ('order_issue', issue_license_v1('test-order-event-1', decode(repeat('71', 32), 'hex'), 'metatweak', 'pro', null, 'order-test@example.com', '70000000-0000-4000-8100-000000000001', 'DL-MT-IJKL', 'MNPQ', decode(repeat('72', 32), 'hex'), null, 1, gen_random_uuid()));
select ok(((select payload from licensing_test_state where name = 'order_issue')->>'created')::boolean, 'paid order issues one license');
insert into licensing_test_state values ('order_retry', issue_license_v1('test-order-event-2', decode(repeat('71', 32), 'hex'), 'metatweak', 'pro', null, 'order-test@example.com', '70000000-0000-4000-8100-000000000001', 'DL-MT-ZZZZ', 'YYYY', decode(repeat('73', 32), 'hex'), null, 1, gen_random_uuid()));
select ok(not ((select payload from licensing_test_state where name = 'order_retry')->>'created')::boolean, 'duplicate order event does not issue twice');
select is((select payload->>'license_id' from licensing_test_state where name = 'order_retry'), (select payload->>'license_id' from licensing_test_state where name = 'order_issue'), 'duplicate order returns the original license');

select ok((select relrowsecurity from pg_class where oid = 'licenses'::regclass), 'licenses table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'license_issuance_requests'::regclass), 'issuance table has RLS enabled');
select ok(not has_function_privilege('anon', 'public.activate_license_v1(bytea,text,bytea,bytea,text,text,text,uuid)', 'EXECUTE'), 'desktop/public role cannot call activation database function');
select is((select count(*)::integer from license_signing_keys where status = 'active'), 1, 'exactly one signing key is active');

select * from finish();
rollback;
