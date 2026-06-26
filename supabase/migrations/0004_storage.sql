-- ============================================================================
-- Storage — bucket privado para anexos de incidências (imagens etc.)
-- Acesso só via URLs assinadas; políticas restringem a usuários autenticados.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,  -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura: qualquer usuário autenticado (o acesso fino é mediado pela tabela
-- incident_attachments + URLs assinadas geradas no servidor).
drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments');

-- Upload: usuário autenticado, dentro de uma "pasta" com seu próprio uid.
drop policy if exists attachments_upload on storage.objects;
create policy attachments_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Remoção: apenas o dono do arquivo.
drop policy if exists attachments_delete_obj on storage.objects;
create policy attachments_delete_obj on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
