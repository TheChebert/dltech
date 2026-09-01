create table public.ebay_marketplace_account_deletions (
  notification_id text primary key,
  webhook_event_id uuid not null unique references public.webhook_events(id) on delete restrict,
  schema_version text not null,
  event_date timestamptz not null,
  latest_publish_date timestamptz not null,
  latest_publish_attempt_count integer not null check (latest_publish_attempt_count > 0),
  delivery_count integer not null default 1 check (delivery_count > 0),
  username_hash bytea,
  user_id_hash bytea,
  eias_token_hash bytea,
  signature_key_id text not null,
  deletion_status text not null default 'pending' check (deletion_status in ('pending', 'purged', 'retained')),
  retained_reason text,
  processed_at timestamptz,
  first_received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),
  check (username_hash is not null or user_id_hash is not null or eias_token_hash is not null),
  check ((deletion_status = 'retained' and retained_reason is not null) or deletion_status <> 'retained')
);

create index ebay_account_deletions_status_event_idx
  on public.ebay_marketplace_account_deletions(deletion_status, event_date);

alter table public.ebay_marketplace_account_deletions enable row level security;

create policy admins_read_ebay_account_deletions
  on public.ebay_marketplace_account_deletions
  for select to authenticated
  using (public.is_admin());

revoke all on public.ebay_marketplace_account_deletions from anon, authenticated;
grant select on public.ebay_marketplace_account_deletions to authenticated;

create or replace function public.record_ebay_marketplace_account_deletion(
  p_notification_id text,
  p_payload_sha256 text,
  p_schema_version text,
  p_event_date timestamptz,
  p_publish_date timestamptz,
  p_publish_attempt_count integer,
  p_username_hash bytea,
  p_user_id_hash bytea,
  p_eias_token_hash bytea,
  p_signature_key_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_payload_sha256 text;
  new_webhook_event_id uuid;
begin
  if p_notification_id is null or length(p_notification_id) = 0 then
    raise exception 'notification id is required';
  end if;
  if p_payload_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid payload hash';
  end if;
  if p_username_hash is null and p_user_id_hash is null and p_eias_token_hash is null then
    raise exception 'at least one identifier hash is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ebay:' || p_notification_id, 0));

  select payload_sha256 into existing_payload_sha256
  from public.webhook_events
  where provider = 'ebay' and provider_event_id = p_notification_id;

  if found then
    if existing_payload_sha256 <> p_payload_sha256 then
      return 'conflict';
    end if;

    update public.ebay_marketplace_account_deletions
    set latest_publish_date = greatest(latest_publish_date, p_publish_date),
        latest_publish_attempt_count = greatest(latest_publish_attempt_count, p_publish_attempt_count),
        delivery_count = delivery_count + 1,
        last_received_at = now()
    where notification_id = p_notification_id;
    return 'duplicate';
  end if;

  insert into public.webhook_events(provider, provider_event_id, event_type, payload_sha256, status)
  values ('ebay', p_notification_id, 'MARKETPLACE_ACCOUNT_DELETION', p_payload_sha256, 'received')
  returning id into new_webhook_event_id;

  insert into public.ebay_marketplace_account_deletions(
    notification_id,
    webhook_event_id,
    schema_version,
    event_date,
    latest_publish_date,
    latest_publish_attempt_count,
    username_hash,
    user_id_hash,
    eias_token_hash,
    signature_key_id
  ) values (
    p_notification_id,
    new_webhook_event_id,
    p_schema_version,
    p_event_date,
    p_publish_date,
    p_publish_attempt_count,
    p_username_hash,
    p_user_id_hash,
    p_eias_token_hash,
    p_signature_key_id
  );

  return 'created';
end;
$$;

revoke all on function public.record_ebay_marketplace_account_deletion(
  text, text, text, timestamptz, timestamptz, integer, bytea, bytea, bytea, text
) from public, anon, authenticated;
grant execute on function public.record_ebay_marketplace_account_deletion(
  text, text, text, timestamptz, timestamptz, integer, bytea, bytea, bytea, text
) to service_role;
