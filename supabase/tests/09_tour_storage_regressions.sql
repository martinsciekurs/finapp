begin;
select plan(11);

select reset_role();

do $$
declare
  _u1 uuid;
  _u2 uuid;
begin
  _u1 := create_test_user('tour-storage-u1@test.com', 'Tour Storage U1');
  _u2 := create_test_user('tour-storage-u2@test.com', 'Tour Storage U2');

  perform set_config('test.tour_u1', _u1::text, true);
  perform set_config('test.tour_u2', _u2::text, true);
end;
$$;

select authenticate_as(current_setting('test.tour_u1')::uuid);

select lives_ok(
  format(
    'select public.append_tour_step(%L, ''welcome-tour'')',
    current_setting('test.tour_u1')::uuid
  ),
  'append_tour_step: appends welcome-tour for owner'
);

select reset_role();
select ok(
  (
    select tour_completed_steps @> '"welcome-tour"'::jsonb
    from public.profiles
    where id = current_setting('test.tour_u1')::uuid
  ),
  'append_tour_step: welcome-tour appears in completed steps'
);

select ok(
  (
    select tour_completed_at is not null
    from public.profiles
    where id = current_setting('test.tour_u1')::uuid
  ),
  'append_tour_step: welcome-tour sets tour_completed_at'
);

select authenticate_as(current_setting('test.tour_u1')::uuid);

select lives_ok(
  format(
    'select public.append_tour_step(%L, ''welcome-tour'')',
    current_setting('test.tour_u1')::uuid
  ),
  'append_tour_step: duplicate welcome-tour is idempotent'
);

select reset_role();
select is(
  (
    select jsonb_array_length(tour_completed_steps)
    from public.profiles
    where id = current_setting('test.tour_u1')::uuid
  ),
  1,
  'append_tour_step: duplicate welcome-tour is not appended twice'
);

select authenticate_as(current_setting('test.tour_u2')::uuid);

select throws_matching(
  format(
    'select public.append_tour_step(%L, ''tip-budget'')',
    current_setting('test.tour_u1')::uuid
  ),
  'Unauthorized',
  'append_tour_step: different user cannot append to another profile'
);

select authenticate_as(current_setting('test.tour_u1')::uuid);

select lives_ok(
  format(
    'insert into storage.objects (bucket_id, name, owner, owner_id) values (''attachments'', ''%s/transaction/regression-a/file.pdf'', %L, %L)',
    current_setting('test.tour_u1'),
    current_setting('test.tour_u1')::uuid,
    current_setting('test.tour_u1')
  ),
  'storage: owner can INSERT own attachment object path'
);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'attachments'
      and name like current_setting('test.tour_u1') || '/%'
  ),
  1,
  'storage: owner can SELECT own inserted attachment object'
);

select throws_ok(
  format(
    'insert into storage.objects (bucket_id, name, owner, owner_id) values (''attachments'', ''%s/transaction/regression-b/file.pdf'', %L, %L)',
    current_setting('test.tour_u2'),
    current_setting('test.tour_u1')::uuid,
    current_setting('test.tour_u1')
  ),
  '42501'::char(5),
  null,
  'storage: user cannot INSERT under another user''s folder path'
);

select authenticate_as(current_setting('test.tour_u2')::uuid);

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'attachments'
      and name like current_setting('test.tour_u1') || '/%'
  ),
  0,
  'storage: user cannot SELECT another user attachment objects'
);

select authenticate_as_anon();

select is(
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'attachments'
  ),
  0,
  'storage: anon cannot SELECT attachment objects'
);

select reset_role();

select * from finish();
rollback;
