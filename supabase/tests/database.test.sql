begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public', 'households', 'households table exists');
select has_function('public', 'record_inventory_movement', array['uuid','uuid','uuid','integer','text'], 'movement RPC exists');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','owner@example.com','',now(),'{}','{"full_name":"Owner"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','member@example.com','',now(),'{}','{"full_name":"Member"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','33333333-3333-3333-3333-333333333333','authenticated','authenticated','outsider@example.com','',now(),'{}','{"full_name":"Outsider"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','44444444-4444-4444-4444-444444444444','authenticated','authenticated','invited@example.com','',now(),'{}','{"full_name":"Invited"}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','55555555-5555-5555-5555-555555555555','authenticated','authenticated','mismatch@example.com','',now(),'{}','{"full_name":"Mismatch"}',now(),now());

select lives_ok(
  $$select public.bootstrap_household('11111111-1111-1111-1111-111111111111', 'Test Home')$$,
  'owner bootstrap succeeds for an explicit auth user'
);

insert into public.households(id, name) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Other Home');
insert into public.household_members(household_id, user_id, role, email)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'owner', 'outsider@example.com');

set local role anon;
select throws_ok(
  $$select count(*) from public.households$$,
  'permission denied for table households',
  'anonymous users cannot read households'
);
reset role;

insert into public.household_members(household_id, user_id, role, email)
select id, '22222222-2222-2222-2222-222222222222', 'member', 'member@example.com' from public.households where name = 'Test Home';

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

insert into public.locations(id, household_id, name) select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', id, 'Garage' from public.households where name = 'Test Home';
insert into public.categories(id, household_id, name) select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', id, 'Tools' from public.households where name = 'Test Home';
insert into public.boxes(id, household_id, name, location_id, category_id, created_by)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', id, 'Box A', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', auth.uid() from public.households where name = 'Test Home';
insert into public.boxes(id, household_id, name, location_id, category_id, created_by)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', id, 'Box B', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', auth.uid() from public.households where name = 'Test Home';
insert into public.items(id, household_id, name) select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', id, 'Drill' from public.households where name = 'Test Home';
insert into public.household_invites(household_id, email, token_hash, expires_at)
select id, 'invited@example.com', encode(extensions.digest('join-token', 'sha256'), 'hex'), now() + interval '1 day' from public.households where name = 'Test Home';
insert into public.household_invites(household_id, email, token_hash, created_at, expires_at)
select id, 'mismatch@example.com', encode(extensions.digest('expired-token', 'sha256'), 'hex'), now() - interval '2 days', now() - interval '1 day' from public.households where name = 'Test Home';

select lives_ok(
  $$select public.record_inventory_movement('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 5, 'Initial stock')$$,
  'member can add inventory through the RPC'
);
select results_eq(
  $$select quantity from public.box_inventory where box_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'$$,
  array[5],
  'add movement creates the current balance'
);
select lives_ok(
  $$select public.record_inventory_movement('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 2, null)$$,
  'transfer succeeds atomically'
);
select results_eq(
  $$select quantity from public.box_inventory where box_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'$$,
  array[3],
  'transfer decreases the source balance'
);
select results_eq(
  $$select quantity from public.box_inventory where box_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'$$,
  array[2],
  'transfer increases the destination balance'
);
select throws_ok(
  $$select public.record_inventory_movement('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', null, 99, null)$$,
  'Not enough inventory in the source box',
  'over-removal fails without changing inventory'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select results_eq($$select count(*)::bigint from public.households$$, array[1::bigint], 'member sees only their household');
select lives_ok(
  $$insert into public.locations(household_id, name) select household_id, 'Attic' from public.household_members where user_id = auth.uid()$$,
  'ordinary members can edit shared inventory settings'
);
select throws_ok(
  $$insert into public.household_invites(household_id, email, token_hash, expires_at) select household_id, 'new@example.com', repeat('a',64), now() + interval '1 day' from public.household_members where user_id = auth.uid()$$,
  'new row violates row-level security policy for table "household_invites"',
  'ordinary members cannot create invitations'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select results_eq($$select count(*)::bigint from public.boxes$$, array[0::bigint], 'another household cannot read boxes');

select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
select throws_ok(
  $$select public.accept_household_invite('join-token')$$,
  'Invitation belongs to a different Google account',
  'invite acceptance rejects a mismatched Google email'
);
select throws_ok(
  $$select public.accept_household_invite('expired-token')$$,
  'Invitation has expired',
  'expired invitations are rejected'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select lives_ok(
  $$select public.accept_household_invite('join-token')$$,
  'the matching Google account accepts an active invitation'
);
select throws_ok(
  $$select public.accept_household_invite('join-token')$$,
  'Invitation is no longer active',
  'accepted invitations cannot be reused'
);

select * from finish();
rollback;
