insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 5242880)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can read own attachment objects'
  ) then
    create policy "Users can read own attachment objects"
      on storage.objects
      for select
      using (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own attachment objects'
  ) then
    create policy "Users can upload own attachment objects"
      on storage.objects
      for insert
      with check (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update own attachment objects'
  ) then
    create policy "Users can update own attachment objects"
      on storage.objects
      for update
      using (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own attachment objects'
  ) then
    create policy "Users can delete own attachment objects"
      on storage.objects
      for delete
      using (
        bucket_id = 'attachments'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end;
$$;
