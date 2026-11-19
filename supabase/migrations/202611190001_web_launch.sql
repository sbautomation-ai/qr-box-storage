create schema if not exists private;

create table public.household_billing (
  household_id uuid primary key references public.households on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  status text,
  period_end timestamptz,
  synced_at timestamptz,
  checkout_key uuid,
  checkout_until timestamptz
);

create table public.photo_cleanup (
  storage_path text primary key,
  queued_at timestamptz not null default now()
);

alter table public.household_billing enable row level security;
alter table public.photo_cleanup enable row level security;
revoke all on public.household_billing, public.photo_cleanup from public, anon, authenticated;
grant all on public.household_billing, public.photo_cleanup to service_role;

create function private.household_has_family(p_household_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.household_billing
    where household_id = p_household_id and status in ('active', 'trialing') and period_end > now()
  );
$$;

create function public.my_household_plan()
returns text language sql stable security definer set search_path = '' as $$
  select case when private.household_has_family(m.household_id) then 'family' else 'free' end
  from public.household_members m where m.user_id = auth.uid();
$$;

create function public.create_my_household(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_household_id uuid;
begin
  select id into v_user_id from auth.users
    where id = auth.uid() and email_confirmed_at is not null for update;
  if not found then raise exception 'Sign in with a verified email first'; end if;
  select household_id into v_household_id from public.household_members where user_id = v_user_id;
  if found then return v_household_id; end if;
  return public.bootstrap_household(v_user_id, trim(p_name));
end;
$$;

create or replace function public.accept_household_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.household_invites%rowtype;
  v_email text;
  v_name text;
  v_household_id uuid;
  v_limit integer;
begin
  select lower(email), coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')
    into v_email, v_name from auth.users
    where id = auth.uid() and email_confirmed_at is not null for update;
  if not found then raise exception 'Sign in with a verified email first'; end if;

  select household_id into v_household_id from public.household_invites
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then raise exception 'Invitation is invalid'; end if;
  perform 1 from public.households where id = v_household_id for no key update;

  select * into v_invite from public.household_invites
    where household_id = v_household_id and token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found then raise exception 'Invitation is invalid'; end if;
  if v_invite.accepted_at is not null or v_invite.revoked_at is not null then raise exception 'Invitation is no longer active'; end if;
  if v_invite.expires_at <= now() then raise exception 'Invitation has expired'; end if;
  if v_invite.email <> v_email then raise exception 'Invitation belongs to a different email address'; end if;
  if exists(select 1 from public.household_members where user_id = auth.uid()) then raise exception 'This account already belongs to a household'; end if;

  v_limit := case when private.household_has_family(v_household_id) then 5 else 2 end;
  if (select count(*) from public.household_members where household_id = v_household_id) >= v_limit then
    raise exception 'This household has reached its member limit';
  end if;

  insert into public.household_members (household_id, user_id, role, email, display_name)
    values (v_household_id, auth.uid(), v_invite.role, v_email, v_name);
  update public.household_invites set accepted_at = now() where id = v_invite.id;
  return v_household_id;
end;
$$;

create function public.create_household_invite(p_email text, p_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_household_id uuid;
  v_email text := lower(trim(p_email));
  v_limit integer;
begin
  select household_id into v_household_id from public.household_members where user_id = auth.uid() and role = 'owner';
  if not found then raise exception 'Owner access required'; end if;
  perform 1 from public.households where id = v_household_id for no key update;
  if not public.is_household_owner(v_household_id) then raise exception 'Owner access required'; end if;
  v_limit := case when private.household_has_family(v_household_id) then 5 else 2 end;
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if exists (select 1 from public.household_members where household_id = v_household_id and email = v_email) then
    raise exception 'That email already belongs to a household member';
  end if;
  if (select count(*) from public.household_members where household_id = v_household_id) >= v_limit then
    raise exception 'This household has reached its member limit';
  end if;
  if (select count(*) from public.household_invites where household_id = v_household_id and created_at > now() - interval '1 day') >= 25 then
    raise exception 'Daily invitation limit reached. Try again tomorrow';
  end if;
  update public.household_invites set revoked_at = now()
    where household_id = v_household_id and email = v_email and accepted_at is null and revoked_at is null;
  insert into public.household_invites (household_id, email, token_hash, expires_at)
    values (v_household_id, v_email, p_token_hash, now() + interval '7 days');
end;
$$;

revoke insert, update on public.household_invites from authenticated;
grant update (revoked_at) on public.household_invites to authenticated;

create or replace function public.remove_household_member(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_household_id uuid; v_role public.household_role;
begin
  select household_id into v_household_id from public.household_members where user_id = auth.uid() and role = 'owner';
  if not found then raise exception 'Owner access required'; end if;
  perform 1 from public.households where id = v_household_id for no key update;
  if not public.is_household_owner(v_household_id) then raise exception 'Owner access required'; end if;
  select role into v_role from public.household_members where household_id = v_household_id and user_id = p_user_id;
  if not found then raise exception 'Member not found'; end if;
  if v_role = 'owner' and (select count(*) from public.household_members where household_id = v_household_id and role = 'owner') <= 1 then
    raise exception 'The final owner cannot be removed';
  end if;
  delete from public.household_members where household_id = v_household_id and user_id = p_user_id;
end;
$$;

create function private.detach_household_billing(p_household_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_billing public.household_billing%rowtype;
begin
  select * into v_billing from public.household_billing where household_id = p_household_id for update;
  if not found then return; end if;
  if v_billing.status in ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete')
    or v_billing.checkout_until > now() then
    raise exception 'Close any pending checkout and cancel your Family subscription in Billing before continuing';
  end if;
  delete from public.household_billing where household_id = p_household_id;
end;
$$;

create function public.transfer_household_ownership(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_household_id uuid;
begin
  select household_id into v_household_id from public.household_members where user_id = auth.uid() and role = 'owner';
  if not found then raise exception 'Owner access required'; end if;
  perform 1 from public.households where id = v_household_id for no key update;
  if not public.is_household_owner(v_household_id) then raise exception 'Owner access required'; end if;
  if p_user_id = auth.uid() then return; end if;
  perform private.detach_household_billing(v_household_id);
  update public.household_members set role = 'owner' where household_id = v_household_id and user_id = p_user_id;
  if not found then raise exception 'Choose a current member'; end if;
  update public.household_members set role = 'member' where household_id = v_household_id and user_id = auth.uid();
end;
$$;

create function private.enforce_box_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_limit integer;
begin
  if auth.uid() is null then return new; end if;
  if not public.is_household_member(new.household_id) then raise exception 'Household access required'; end if;
  perform 1 from public.households where id = new.household_id for no key update;
  if not public.is_household_member(new.household_id) then raise exception 'Household access required'; end if;
  v_limit := case when private.household_has_family(new.household_id) then 200 else 10 end;
  if (select count(*) from public.boxes where household_id = new.household_id and deleted_at is null) >= v_limit then
    raise exception 'Your household has reached its active box limit';
  end if;
  return new;
end;
$$;

revoke insert, update on public.boxes from authenticated;
grant insert (id, household_id, name, description, location_id, category_id, created_by) on public.boxes to authenticated;
grant update (name, description, location_id, category_id) on public.boxes to authenticated;
create trigger boxes_enforce_limit before insert on public.boxes for each row execute function private.enforce_box_limit();

create function private.prepare_box_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_limit integer;
begin
  if not public.is_household_member(new.household_id) then raise exception 'Household access required'; end if;
  perform 1 from public.households where id = new.household_id for no key update;
  if not public.is_household_member(new.household_id) then raise exception 'Household access required'; end if;
  perform 1 from public.boxes where id = new.box_id and household_id = new.household_id and deleted_at is null for update;
  if not found then raise exception 'Box not found'; end if;
  if new.storage_path !~ ('^' || new.household_id || '/' || new.box_id || '/[0-9a-f-]{36}[.][a-z0-9]+$') then
    raise exception 'Invalid photo path';
  end if;
  if exists(select 1 from public.photo_cleanup where storage_path = new.storage_path) then
    raise exception 'That photo path is awaiting cleanup';
  end if;
  v_limit := case when private.household_has_family(new.household_id) then 200 else 10 end;
  if (select count(*) from public.photos where household_id = new.household_id) >= v_limit then
    raise exception 'Your household has reached its photo limit';
  end if;
  return new;
end;
$$;

create trigger photos_prepare before insert on public.photos for each row execute function private.prepare_box_photo();

create function private.enqueue_photo_cleanup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.storage_path ~ ('^' || old.household_id || '/' || old.box_id || '/[0-9a-f-]{36}[.][a-z0-9]+$') then
    insert into public.photo_cleanup (storage_path) values (old.storage_path) on conflict do nothing;
  end if;
  return old;
end;
$$;

create trigger photos_enqueue_cleanup after delete on public.photos for each row execute function private.enqueue_photo_cleanup();

create function public.can_access_box_photo(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.photos p join public.boxes b on b.id = p.box_id
    where p.storage_path = p_path and b.deleted_at is null and public.is_household_member(p.household_id)
  );
$$;

create function public.can_upload_box_photo(p_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_box_id uuid;
begin
  select p.box_id into v_box_id from public.photos p
    where p.storage_path = p_path and p.created_by = auth.uid() and public.is_household_member(p.household_id);
  if not found then return false; end if;
  perform 1 from public.boxes where id = v_box_id and deleted_at is null for update;
  if not found then return false; end if;
  perform 1 from public.photos p where p.storage_path = p_path and p.created_by = auth.uid() for update;
  return found;
end;
$$;

drop policy box_photos_select_member on storage.objects;
drop policy box_photos_insert_member on storage.objects;
drop policy box_photos_delete_member on storage.objects;
create policy box_photos_select_member on storage.objects for select to authenticated
  using (bucket_id = 'box-photos' and public.can_access_box_photo(name));
create policy box_photos_insert_reserved on storage.objects for insert to authenticated
  with check (bucket_id = 'box-photos' and public.can_upload_box_photo(name));

revoke all on function public.my_household_plan(), public.create_my_household(text),
  public.create_household_invite(text, text), public.transfer_household_ownership(uuid),
  public.can_access_box_photo(text), public.can_upload_box_photo(text)
  from public, anon, authenticated;
grant execute on function public.my_household_plan(), public.create_my_household(text),
  public.create_household_invite(text, text), public.transfer_household_ownership(uuid),
  public.can_access_box_photo(text), public.can_upload_box_photo(text) to authenticated;

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
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  if p_from_box_id is null and p_to_box_id is not null then v_kind := 'add';
  elsif p_from_box_id is not null and p_to_box_id is null then v_kind := 'remove';
  elsif p_from_box_id is not null and p_to_box_id is not null and p_from_box_id <> p_to_box_id then v_kind := 'transfer';
  else raise exception 'Invalid movement shape'; end if;

  select household_id into v_household_id from public.items where id = p_item_id;
  if v_household_id is null or not public.is_household_member(v_household_id) then raise exception 'Not authorized for this item'; end if;
  perform id from public.boxes
    where id in (p_from_box_id, p_to_box_id) and household_id = v_household_id
    order by id for update;

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

alter table public.boxes alter column created_by drop not null,
  drop constraint boxes_created_by_fkey,
  add constraint boxes_created_by_fkey foreign key (created_by) references auth.users on delete set null;
alter table public.inventory_movements alter column created_by drop not null,
  drop constraint inventory_movements_created_by_fkey,
  add constraint inventory_movements_created_by_fkey foreign key (created_by) references auth.users on delete set null;
alter table public.photos alter column created_by drop not null,
  drop constraint photos_created_by_fkey,
  add constraint photos_created_by_fkey foreign key (created_by) references auth.users on delete set null;
alter table public.household_invites alter column created_by drop not null,
  drop constraint household_invites_created_by_fkey,
  add constraint household_invites_created_by_fkey foreign key (created_by) references auth.users on delete set null;

create function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_email text;
  v_household_id uuid;
  v_role public.household_role;
begin
  select id, lower(email) into v_user_id, v_email from auth.users
    where id = auth.uid() for update;
  if not found then return; end if;

  select household_id into v_household_id from public.household_members where user_id = v_user_id;
  if found then
    perform 1 from public.households where id = v_household_id for no key update;
    select role into v_role from public.household_members where user_id = v_user_id and household_id = v_household_id;
    if v_role = 'owner' and (select count(*) from public.household_members where household_id = v_household_id) > 1 then
      raise exception 'Transfer ownership to another household member in Settings before deleting your account';
    end if;
    if v_role = 'owner' then
      perform private.detach_household_billing(v_household_id);
      perform id from public.boxes where household_id = v_household_id order by id for update;
      delete from public.inventory_movements where household_id = v_household_id;
      delete from public.box_inventory where household_id = v_household_id;
      delete from public.photos where household_id = v_household_id;
      delete from public.boxes where household_id = v_household_id;
      delete from public.households where id = v_household_id;
    else
      -- Finish any in-flight photo upload before clearing its uploader attribution.
      perform id from public.boxes where household_id = v_household_id order by id for update;
    end if;
  end if;

  delete from public.household_invites where email = v_email;
  update storage.objects set owner_id = null, owner = null
    where bucket_id = 'box-photos' and (owner_id = v_user_id::text or owner = v_user_id);
  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
