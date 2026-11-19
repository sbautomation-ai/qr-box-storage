create function public.reserve_household_checkout(p_household_id uuid, p_owner_id uuid, p_customer_id text)
returns table (stripe_customer_id text, checkout_key uuid, checkout_until timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.households where id = p_household_id for no key update;
  if not found or not exists (
    select 1 from public.household_members
      where household_id = p_household_id and user_id = p_owner_id and role = 'owner'
  ) then
    raise exception 'Owner access required';
  end if;

  insert into public.household_billing (household_id, stripe_customer_id)
    values (p_household_id, p_customer_id) on conflict (household_id) do nothing;

  if exists (
    select 1 from public.household_billing b where household_id = p_household_id
      and b.status in ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete')
  ) then
    raise exception 'Manage your existing subscription in Billing';
  end if;

  update public.household_billing b
    set checkout_key = gen_random_uuid(), checkout_until = clock_timestamp() + interval '45 minutes'
    where b.household_id = p_household_id and (b.checkout_until is null or b.checkout_until <= clock_timestamp());

  return query select b.stripe_customer_id, b.checkout_key, b.checkout_until
    from public.household_billing b where b.household_id = p_household_id;
end;
$$;

revoke all on function public.reserve_household_checkout(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_household_checkout(uuid, uuid, text) to service_role;

create function public.expire_missing_box_photos()
returns void language sql security definer set search_path = '' as $$
  with candidates as (
    select p.id from public.photos p where p.created_at < now() - interval '1 hour'
      and not exists (select 1 from storage.objects s where s.bucket_id = 'box-photos' and s.name = p.storage_path)
    order by p.created_at limit 100 for update of p skip locked
  )
  delete from public.photos where id in (select id from candidates);
$$;

revoke all on function public.expire_missing_box_photos() from public, anon, authenticated;
grant execute on function public.expire_missing_box_photos() to service_role;
