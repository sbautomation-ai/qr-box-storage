create table public.billing_withdrawals (
  id uuid primary key,
  requester_id uuid not null,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text not null check (char_length(customer_email) between 3 and 320),
  purchase_reference text not null check (char_length(purchase_reference) between 1 and 160),
  requested_at timestamptz not null default clock_timestamp(),
  acknowledged_at timestamptz,
  next_attempt_at timestamptz not null default '-infinity'
);

alter table public.billing_withdrawals enable row level security;
revoke all on public.billing_withdrawals from public, anon, authenticated;
grant select, insert, update on public.billing_withdrawals to service_role;

create index billing_withdrawals_requester_idx on public.billing_withdrawals (requester_id, requested_at);
create index billing_withdrawals_pending_idx on public.billing_withdrawals (next_attempt_at)
  where acknowledged_at is null;

create function public.record_billing_withdrawal(
  p_id uuid, p_requester_id uuid, p_name text, p_email text, p_purchase_reference text
) returns setof public.billing_withdrawals
language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('billing-withdrawal:' || p_requester_id::text, 0));

  return query select * from public.billing_withdrawals
    where id = p_id and requester_id = p_requester_id;
  if found then return; end if;

  if (select count(*) from public.billing_withdrawals
    where requester_id = p_requester_id and requested_at >= now() - interval '1 day') >= 3 then
    raise exception using errcode = 'P0001', message = 'withdrawal_rate_limit';
  end if;

  return query insert into public.billing_withdrawals (id, requester_id, customer_name, customer_email, purchase_reference)
    values (p_id, p_requester_id, p_name, p_email, p_purchase_reference)
    returning *;
end;
$$;

revoke all on function public.record_billing_withdrawal(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_billing_withdrawal(uuid, uuid, text, text, text) to service_role;
