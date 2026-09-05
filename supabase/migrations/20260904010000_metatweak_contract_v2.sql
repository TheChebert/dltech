begin;

insert into public.features (id, product_id, feature_key, name, description, metadata) values
(
  '44444444-1000-4000-8000-000000000012',
  '44444444-4444-4444-8444-444444444444',
  'extended_file_type_editing',
  'Extended file-type editing',
  'Edit embedded metadata in supported non-Office formats; file opening and inspection are not gated.',
  jsonb_build_object('contract_version', 2)
),
(
  '44444444-1000-4000-8000-000000000013',
  '44444444-4444-4444-8444-444444444444',
  'advanced_backup_controls',
  'Advanced backup controls',
  'Configure optional backup behavior and management; mandatory safety backups remain in the local baseline.',
  jsonb_build_object('contract_version', 2)
)
on conflict (id) do update set
  feature_key = excluded.feature_key,
  name = excluded.name,
  description = excluded.description,
  metadata = public.features.metadata || excluded.metadata,
  updated_at = now();

update public.features
set metadata = metadata || jsonb_build_object(
  'deprecated', true,
  'deprecated_in_contract', 2,
  'replacement', case feature_key
    when 'all_file_types' then 'extended_file_type_editing'
    when 'backup_controls' then 'advanced_backup_controls'
    when 'advanced_operations' then 'Use specific feature capabilities'
    else null
  end
),
description = case feature_key
  when 'all_file_types' then 'Deprecated: replaced by extended_file_type_editing; opening and inspection are not gated.'
  when 'file_attributes' then 'Deprecated until a truthful shipping file-attribute capability exists.'
  when 'backup_controls' then 'Deprecated: replaced by advanced_backup_controls; basic safety backups remain Free.'
  when 'advanced_operations' then 'Deprecated: operations map to specific capabilities; history and undo remain Free.'
  else description
end,
updated_at = now()
where product_id = '44444444-4444-4444-8444-444444444444'
  and feature_key in ('all_file_types', 'file_attributes', 'backup_controls', 'advanced_operations');

delete from public.edition_features grants
using public.features features, public.product_editions editions
where grants.feature_id = features.id
  and grants.edition_id = editions.id
  and features.product_id = '44444444-4444-4444-8444-444444444444'
  and editions.product_id = features.product_id
  and editions.code in ('free', 'pro');

insert into public.edition_features (edition_id, feature_id)
select editions.id, features.id
from public.product_editions editions
join public.features features on features.product_id = editions.product_id
where editions.product_id = '44444444-4444-4444-8444-444444444444'
  and editions.code = 'free'
  and features.feature_key = 'document_metadata';

insert into public.edition_features (edition_id, feature_id)
select editions.id, features.id
from public.product_editions editions
join public.features features on features.product_id = editions.product_id
where editions.product_id = '44444444-4444-4444-8444-444444444444'
  and editions.code = 'pro'
  and features.feature_key in (
    'document_metadata',
    'advanced_metadata',
    'extended_file_type_editing',
    'datetime_editing',
    'advanced_backup_controls',
    'backup_auto_cleanup',
    'batch_editing',
    'presets',
    'explorer_integration'
  );

commit;
