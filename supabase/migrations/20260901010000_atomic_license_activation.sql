begin;

create or replace function public.activate_license_installation(
  p_license_id uuid,
  p_installation_id uuid,
  p_activation_token_hash bytea,
  p_device_name text,
  p_platform text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_activation_id uuid;
  v_existing_deactivated_at timestamptz;
  v_max_activations integer;
  v_active_count integer;
  v_now timestamptz := now();
begin
  select max_activations
  into v_max_activations
  from public.licenses
  where id = p_license_id
  for update;

  if v_max_activations is null then
    return 'license_not_found';
  end if;

  select id, deactivated_at
  into v_existing_activation_id, v_existing_deactivated_at
  from public.license_activations
  where license_id = p_license_id
    and installation_id = p_installation_id;

  if v_existing_activation_id is null or v_existing_deactivated_at is not null then
    select count(*)
    into v_active_count
    from public.license_activations
    where license_id = p_license_id
      and deactivated_at is null;

    if v_active_count >= v_max_activations then
      return 'activation_limit_reached';
    end if;
  end if;

  insert into public.license_activations (
    license_id,
    installation_id,
    activation_token_hash,
    activated_at,
    last_validated_at,
    deactivated_at,
    deactivation_reason,
    device_name,
    platform
  )
  values (
    p_license_id,
    p_installation_id,
    p_activation_token_hash,
    v_now,
    v_now,
    null,
    null,
    p_device_name,
    p_platform
  )
  on conflict (license_id, installation_id) do update
  set
    activation_token_hash = excluded.activation_token_hash,
    activated_at = excluded.activated_at,
    last_validated_at = excluded.last_validated_at,
    deactivated_at = null,
    deactivation_reason = null,
    device_name = excluded.device_name,
    platform = excluded.platform;

  return 'activated';
end;
$$;

revoke all on function public.activate_license_installation(uuid, uuid, bytea, text, text)
from public, anon, authenticated;
grant execute on function public.activate_license_installation(uuid, uuid, bytea, text, text)
to service_role;

commit;
