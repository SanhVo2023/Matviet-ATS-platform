-- Migration 0009 — Private storage buckets + RLS policies
-- Buckets: cvs, assessments, submissions, email-attachments, assets

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cvs', 'cvs', false, 10485760, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']),
  ('assessments', 'assessments', false, 20971520, null),
  ('submissions', 'submissions', false, 20971520, null),
  ('email-attachments', 'email-attachments', false, 20971520, null),
  ('assets', 'assets', true, 5242880, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies — HR can read/write everything; managers read CVs of their candidates
drop policy if exists "storage_assets_public_read" on storage.objects;
create policy "storage_assets_public_read" on storage.objects for select
  using (bucket_id = 'assets');

drop policy if exists "storage_hr_full" on storage.objects;
create policy "storage_hr_full" on storage.objects for all to authenticated
  using (
    bucket_id in ('cvs','assessments','submissions','email-attachments','assets')
    and public.is_hr()
  )
  with check (
    bucket_id in ('cvs','assessments','submissions','email-attachments','assets')
    and public.is_hr()
  );

drop policy if exists "storage_manager_cv_read" on storage.objects;
create policy "storage_manager_cv_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'cvs'
    and exists (
      select 1
      from public.cv_files cf
      join public.candidates c on c.cv_file_id = cf.id
      where (cf.storage_path = storage.objects.name or cf.pdf_storage_path = storage.objects.name)
        and public.is_manager_for_job(c.job_id)
    )
  );
