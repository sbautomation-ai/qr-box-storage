create extension if not exists pgcrypto with schema extensions;

create type public.household_role as enum ('owner', 'member');
create type public.inventory_movement_kind as enum ('add', 'remove', 'transfer');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  email text not null,
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  role public.household_role not null default 'member',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create unique index household_invites_one_active_email
  on public.household_invites (household_id, lower(email))
  where accepted_at is null and revoked_at is null;

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.locations add constraint locations_household_id_id_unique unique (household_id, id);
create unique index locations_household_name_unique on public.locations (household_id, lower(name));

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.categories add constraint categories_household_id_id_unique unique (household_id, id);
create unique index categories_household_name_unique on public.categories (household_id, lower(name));

create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  location_id uuid not null,
  category_id uuid not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (household_id, id)
);
alter table public.boxes
  add constraint boxes_location_same_household foreign key (household_id, location_id) references public.locations(household_id, id) on delete restrict,
  add constraint boxes_category_same_household foreign key (household_id, category_id) references public.categories(household_id, id) on delete restrict;
create index boxes_household_active_idx on public.boxes (household_id, updated_at desc) where deleted_at is null;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  unique (household_id, id)
);
create index items_household_name_idx on public.items (household_id, lower(name));

create table public.box_inventory (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  box_id uuid not null,
  item_id uuid not null,
  quantity integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  unique (box_id, item_id)
);
alter table public.box_inventory
  add constraint inventory_box_same_household foreign key (household_id, box_id) references public.boxes(household_id, id) on delete cascade,
  add constraint inventory_item_same_household foreign key (household_id, item_id) references public.items(household_id, id) on delete restrict;

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  from_box_id uuid references public.boxes(id) on delete restrict,
  to_box_id uuid references public.boxes(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  kind public.inventory_movement_kind not null,
  note text check (note is null or char_length(note) <= 500),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  constraint movement_shape check (
    (kind = 'add' and from_box_id is null and to_box_id is not null) or
    (kind = 'remove' and from_box_id is not null and to_box_id is null) or
    (kind = 'transfer' and from_box_id is not null and to_box_id is not null and from_box_id <> to_box_id)
  )
);
create index movements_household_created_idx on public.inventory_movements (household_id, created_at desc);
create index movements_from_box_idx on public.inventory_movements (from_box_id, created_at desc);
create index movements_to_box_idx on public.inventory_movements (to_box_id, created_at desc);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  box_id uuid not null,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null check (mime_type like 'image/%'),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.photos
  add constraint photos_box_same_household foreign key (household_id, box_id) references public.boxes(household_id, id) on delete cascade;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger boxes_set_updated_at before update on public.boxes for each row execute function public.set_updated_at();

create or replace function public.is_household_member(p_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.household_members where household_id = p_household_id and user_id = auth.uid());
$$;

create or replace function public.is_household_owner(p_household_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.household_members where household_id = p_household_id and user_id = auth.uid() and role = 'owner');
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant select on public.households, public.household_members, public.household_invites, public.locations, public.categories, public.boxes, public.items, public.box_inventory, public.inventory_movements, public.photos to authenticated;
grant insert, update on public.household_invites, public.locations, public.categories, public.boxes, public.items to authenticated;
grant delete on public.locations, public.categories, public.photos to authenticated;
grant insert on public.photos to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.locations enable row level security;
alter table public.categories enable row level security;
alter table public.boxes enable row level security;
alter table public.items enable row level security;
alter table public.box_inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.photos enable row level security;

create policy households_select_member on public.households for select to authenticated using (public.is_household_member(id));
create policy households_update_owner on public.households for update to authenticated using (public.is_household_owner(id)) with check (public.is_household_owner(id));
create policy members_select_member on public.household_members for select to authenticated using (public.is_household_member(household_id));
create policy invites_select_owner on public.household_invites for select to authenticated using (public.is_household_owner(household_id));
create policy invites_insert_owner on public.household_invites for insert to authenticated with check (public.is_household_owner(household_id) and created_by = auth.uid());
create policy invites_update_owner on public.household_invites for update to authenticated using (public.is_household_owner(household_id)) with check (public.is_household_owner(household_id));

create policy locations_select_member on public.locations for select to authenticated using (public.is_household_member(household_id));
create policy locations_insert_member on public.locations for insert to authenticated with check (public.is_household_member(household_id));
create policy locations_update_member on public.locations for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy locations_delete_member on public.locations for delete to authenticated using (public.is_household_member(household_id));
create policy categories_select_member on public.categories for select to authenticated using (public.is_household_member(household_id));
create policy categories_insert_member on public.categories for insert to authenticated with check (public.is_household_member(household_id));
create policy categories_update_member on public.categories for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy categories_delete_member on public.categories for delete to authenticated using (public.is_household_member(household_id));

create policy boxes_select_member on public.boxes for select to authenticated using (public.is_household_member(household_id));
create policy boxes_insert_member on public.boxes for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy boxes_update_member on public.boxes for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy items_select_member on public.items for select to authenticated using (public.is_household_member(household_id));
create policy items_insert_member on public.items for insert to authenticated with check (public.is_household_member(household_id));
create policy items_update_member on public.items for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy balances_select_member on public.box_inventory for select to authenticated using (public.is_household_member(household_id));
create policy movements_select_member on public.inventory_movements for select to authenticated using (public.is_household_member(household_id));
create policy photos_select_member on public.photos for select to authenticated using (public.is_household_member(household_id));
create policy photos_insert_member on public.photos for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy photos_delete_member on public.photos for delete to authenticated using (public.is_household_member(household_id));

create or replace function public.record_inventory_movement(
  p_item_id uuid,
  p_from_box_id uuid default null,
  p_to_box_id uuid default null,
  p_quantity integer default 1,
  p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_household_id uuid;
  v_source_quantity integer;
  v_kind public.inventory_movement_kind;
  v_movement_id uuid;
begin
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  if p_from_box_id is null and p_to_box_id is not null then v_kind := 'add';
  elsif p_from_box_id is not null and p_to_box_id is null then v_kind := 'remove';
  elsif p_from_box_id is not null and p_to_box_id is not null and p_from_box_id <> p_to_box_id then v_kind := 'transfer';
  else raise exception 'Invalid movement shape'; end if;

  select household_id into v_household_id from public.items where id = p_item_id;
  if v_household_id is null or not public.is_household_member(v_household_id) then raise exception 'Not authorized for this item'; end if;
  if p_from_box_id is not null and not exists(select 1 from public.boxes where id = p_from_box_id and household_id = v_household_id and deleted_at is null) then raise exception 'Invalid source box'; end if;
  if p_to_box_id is not null and not exists(select 1 from public.boxes where id = p_to_box_id and household_id = v_household_id and deleted_at is null) then raise exception 'Invalid destination box'; end if;

  if p_from_box_id is not null then
    select quantity into v_source_quantity from public.box_inventory where box_id = p_from_box_id and item_id = p_item_id for update;
    if coalesce(v_source_quantity, 0) < p_quantity then raise exception 'Not enough inventory in the source box'; end if;
    if v_source_quantity = p_quantity then delete from public.box_inventory where box_id = p_from_box_id and item_id = p_item_id;
    else update public.box_inventory set quantity = quantity - p_quantity, updated_at = now() where box_id = p_from_box_id and item_id = p_item_id;
    end if;
  end if;

  if p_to_box_id is not null then
    insert into public.box_inventory (household_id, box_id, item_id, quantity)
    values (v_household_id, p_to_box_id, p_item_id, p_quantity)
    on conflict (box_id, item_id) do update set quantity = public.box_inventory.quantity + excluded.quantity, updated_at = now();
  end if;

  insert into public.inventory_movements (household_id, item_id, from_box_id, to_box_id, quantity, kind, note, created_by)
  values (v_household_id, p_item_id, p_from_box_id, p_to_box_id, p_quantity, v_kind, nullif(trim(p_note), ''), auth.uid()) returning id into v_movement_id;
  update public.boxes set updated_at = now() where id in (p_from_box_id, p_to_box_id);
  return v_movement_id;
end;
$$;

create or replace function public.accept_household_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invite public.household_invites%rowtype; v_email text; v_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select lower(email), coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name') into v_email, v_name from auth.users where id = auth.uid();
  select * into v_invite from public.household_invites where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if v_invite.id is null then raise exception 'Invitation is invalid'; end if;
  if v_invite.accepted_at is not null or v_invite.revoked_at is not null then raise exception 'Invitation is no longer active'; end if;
  if v_invite.expires_at <= now() then raise exception 'Invitation has expired'; end if;
  if lower(v_invite.email) <> v_email then raise exception 'Invitation belongs to a different Google account'; end if;
  if exists(select 1 from public.household_members where user_id = auth.uid()) then raise exception 'This account already belongs to a household'; end if;
  insert into public.household_members (household_id, user_id, role, email, display_name) values (v_invite.household_id, auth.uid(), v_invite.role, v_email, v_name);
  update public.household_invites set accepted_at = now() where id = v_invite.id;
  return v_invite.household_id;
end;
$$;

create or replace function public.remove_household_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_household_id uuid; v_role public.household_role; v_owner_count integer;
begin
  select household_id into v_household_id from public.household_members where user_id = auth.uid() and role = 'owner';
  if v_household_id is null then raise exception 'Owner access required'; end if;
  select role into v_role from public.household_members where household_id = v_household_id and user_id = p_user_id;
  if v_role is null then raise exception 'Member not found'; end if;
  if v_role = 'owner' then
    select count(*) into v_owner_count from public.household_members where household_id = v_household_id and role = 'owner';
    if v_owner_count <= 1 then raise exception 'The final owner cannot be removed'; end if;
  end if;
  delete from public.household_members where household_id = v_household_id and user_id = p_user_id;
end;
$$;

create or replace function public.archive_box(p_box_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_box public.boxes%rowtype; v_balance record;
begin
  select * into v_box from public.boxes where id = p_box_id and deleted_at is null for update;
  if v_box.id is null or not public.is_household_member(v_box.household_id) then raise exception 'Box not found'; end if;
  for v_balance in select item_id, quantity from public.box_inventory where box_id = p_box_id for update loop
    insert into public.inventory_movements (household_id, item_id, from_box_id, quantity, kind, note, created_by)
    values (v_box.household_id, v_balance.item_id, p_box_id, v_balance.quantity, 'remove', 'Box archived', auth.uid());
  end loop;
  delete from public.box_inventory where box_id = p_box_id;
  delete from public.photos where box_id = p_box_id;
  update public.boxes set deleted_at = now(), updated_at = now() where id = p_box_id;
end;
$$;

revoke all on function public.record_inventory_movement(uuid, uuid, uuid, integer, text) from public;
revoke all on function public.accept_household_invite(text) from public;
revoke all on function public.remove_household_member(uuid) from public;
revoke all on function public.archive_box(uuid) from public;
grant execute on function public.record_inventory_movement(uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.remove_household_member(uuid) to authenticated;
grant execute on function public.archive_box(uuid) to authenticated;

create or replace function public.bootstrap_household(p_owner_user_id uuid, p_household_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_household_id uuid; v_email text; v_name text;
begin
  select lower(email), coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name') into v_email, v_name from auth.users where id = p_owner_user_id;
  if v_email is null then raise exception 'Owner auth user does not exist'; end if;
  if exists(select 1 from public.household_members where user_id = p_owner_user_id) then raise exception 'User already belongs to a household'; end if;
  insert into public.households(name) values (trim(p_household_name)) returning id into v_household_id;
  insert into public.household_members(household_id, user_id, role, email, display_name) values (v_household_id, p_owner_user_id, 'owner', v_email, v_name);
  return v_household_id;
end;
$$;
revoke all on function public.bootstrap_household(uuid, text) from public, anon, authenticated;
grant execute on function public.bootstrap_household(uuid, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('box-photos', 'box-photos', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy box_photos_select_member on storage.objects for select to authenticated using (bucket_id = 'box-photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy box_photos_insert_member on storage.objects for insert to authenticated with check (bucket_id = 'box-photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy box_photos_delete_member on storage.objects for delete to authenticated using (bucket_id = 'box-photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
