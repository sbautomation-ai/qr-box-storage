begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, email_confirmed_at)
values
  ('80000000-0000-0000-0000-000000000001', 'web-owner@example.com', now()),
  ('80000000-0000-0000-0000-000000000002', 'web-member@example.com', now()),
  ('80000000-0000-0000-0000-000000000003', 'web-unverified@example.com', null),
  ('80000000-0000-0000-0000-000000000004', 'web-guest@example.com', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000003', true);
select throws_ok($$select public.create_my_household('Unverified')$$, 'Sign in with a verified email first', 'onboarding requires a verified email');
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000001', true);
select lives_ok($$select public.create_my_household('Web Home')$$, 'verified owner can provision a household');
select is(public.create_my_household('Duplicate'), (select id from public.households where name = 'Web Home'), 'retry returns the existing household');
select is(public.my_household_plan(), 'free', 'new households start Free');

insert into public.locations(id, household_id, name)
select '81000000-0000-0000-0000-000000000001', id, 'Attic' from public.households;
insert into public.categories(id, household_id, name)
select '82000000-0000-0000-0000-000000000001', id, 'Camping' from public.households;
insert into public.boxes(id, household_id, name, location_id, category_id)
select ('83000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, id, 'Box ' || i,
  '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001'
from public.households cross join generate_series(1, 10) i;

select throws_ok($$insert into public.boxes(household_id, name, location_id, category_id)
  select id, 'Over limit', '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001' from public.households$$,
  'Your household has reached its active box limit', 'the Free box limit is enforced in Postgres');
select throws_like($$update public.boxes set deleted_at = now()$$, '%permission denied%', 'clients cannot bypass archive');
select throws_ok($$insert into public.photos(household_id, box_id, storage_path, original_name, mime_type, size_bytes)
  select id, '83000000-0000-0000-0000-000000000001', 'unrelated-path.png', 'example.png', 'image/png', 50 from public.households$$,
  'Invalid photo path', 'reserved photos must belong to their box path');

insert into public.photos(household_id, box_id, storage_path, original_name, mime_type, size_bytes)
select id, '83000000-0000-0000-0000-000000000001', id || '/83000000-0000-0000-0000-000000000001/84000000-0000-0000-0000-000000000001.png',
  'example.png', 'image/png', 50 from public.households;

select lives_ok($$select public.archive_box('83000000-0000-0000-0000-000000000001')$$, 'archive succeeds before physical cleanup');
select is((select count(*) from public.photos), 0::bigint, 'archived photo metadata is removed');
reset role;
select is((select count(*) from public.photo_cleanup), 1::bigint, 'photo removal was queued transactionally');

set local role authenticated;
select public.create_household_invite('web-member@example.com', encode(extensions.digest('web-member-token', 'sha256'), 'hex'));
select public.create_household_invite('web-guest@example.com', encode(extensions.digest('web-guest-token', 'sha256'), 'hex'));
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000002', true);
select public.accept_household_invite('web-member-token');
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000004', true);
select throws_ok($$select public.accept_household_invite('web-guest-token')$$, 'This household has reached its member limit', 'concurrent outstanding invites respect the active seat limit');
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.delete_my_account()$$,
  'Transfer ownership to another household member in Settings before deleting your account', 'an owner cannot leave a shared household without an owner');
select public.transfer_household_ownership('80000000-0000-0000-0000-000000000002');
select public.delete_my_account();
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.boxes where deleted_at is null), 9::bigint, 'inventory remains after the previous owner deletes their account');
select lives_ok($$select public.delete_my_account()$$, 'the final owner can delete the household and their account');

select * from finish();
rollback;
