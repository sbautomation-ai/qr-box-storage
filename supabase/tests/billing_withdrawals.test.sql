begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select ok(not has_table_privilege('anon', 'public.billing_withdrawals', 'SELECT'), 'signed-out visitors cannot read withdrawals');
select ok(not has_table_privilege('authenticated', 'public.billing_withdrawals', 'SELECT'), 'customers cannot read the queue directly');
select ok(not has_function_privilege('authenticated', 'public.record_billing_withdrawal(uuid,uuid,text,text,text)', 'EXECUTE'), 'only the server can record a withdrawal');

set local role service_role;
select is(
  (select customer_name from public.record_billing_withdrawal('91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', 'Demo Customer', 'demo@example.com', 'QR-DEMO-1')),
  'Demo Customer', 'the server records a confirmed withdrawal'
);
select is(
  (select purchase_reference from public.record_billing_withdrawal('91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002', 'Demo Customer', 'demo@example.com', 'QR-DEMO-2')),
  'QR-DEMO-1', 'a retry returns the original submission without changing its contents'
);
select is((select count(*) from public.billing_withdrawals), 1::bigint, 'retry does not enqueue a duplicate');
select ok((select acknowledged_at is null and next_attempt_at <= now() from public.billing_withdrawals), 'new requests are ready for email acknowledgement');
select throws_ok($$select * from public.record_billing_withdrawal('91000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000003', 'Other Customer', 'other@example.com', 'QR-DEMO-1')$$,
  '23505', null, 'a different customer cannot retrieve an existing request');

do $$
begin
  perform * from public.record_billing_withdrawal('91000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000002', 'Demo Customer', 'demo@example.com', 'QR-DEMO-2');
  perform * from public.record_billing_withdrawal('91000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000002', 'Demo Customer', 'demo@example.com', 'QR-DEMO-3');
end;
$$;
select throws_ok($$select * from public.record_billing_withdrawal('91000000-0000-4000-8000-000000000006', '91000000-0000-4000-8000-000000000002', 'Demo Customer', 'demo@example.com', 'QR-DEMO-4')$$,
  'withdrawal_rate_limit', 'further daily requests are limited');

select * from finish();
rollback;
