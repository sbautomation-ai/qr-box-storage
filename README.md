# QR Box Storage

A private, shared household inventory for QR-labelled storage boxes. Households can sign up using an email code or Google, search boxes and their contents, record inventory movements, attach private photos, and print QR labels that reopen the correct box after authentication.

## Architecture

- React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, and accessible Radix dialogs.
- Supabase Auth, Postgres, Row Level Security, transactional RPCs, and private Storage.
- Supabase Edge Functions for photo cleanup and Stripe Checkout, the billing portal, and webhooks.
- Vercel static hosting with SPA route rewrites.
- Vitest/Testing Library, pgTAP/Supabase CLI, and Playwright verification.

The browser receives only a Supabase project URL and publishable key. Those values identify the backend but do not authorize data access; all household boundaries and owner-only operations are enforced by RLS and database functions.

## Prerequisites

- Node.js 22+
- Docker Desktop for the local Supabase stack
- A Supabase account and project for deployment
- An OAuth web client for hosted Google sign-in and a custom SMTP provider for email codes
- A Stripe account to enable paid web checkout
- Vercel CLI/account access for deployment

## Local development

```bash
npm install
npx supabase start
cp .env.example .env.local
```

Copy `API_URL` and `PUBLISHABLE_KEY` from `npx supabase status` into `.env.local`, then run:

```bash
npm run dev
```

Local email signup and login use the codes delivered to Mailpit at `http://127.0.0.1:54324`. Google OAuth is disabled locally by default. To test Google, use a configured development backend or set up a local OAuth client with its secret outside Git.

Useful checks:

```bash
npm run check
npx supabase db lint --local --level warning
npx supabase test db
E2E_MAILPIT_URL=http://127.0.0.1:54324 npm run test:e2e
```

## Prepare the hosted backend

1. Resume the existing Supabase project if it is paused. Keep the existing project and public label URL when releasing an update so active sessions and previously printed labels still work. For a new installation, create a Supabase project and note its reference, URL, and publishable key.
2. Back up the existing database and Storage objects, then link and migrate the intended project:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

3. In Google Auth Platform, create an OAuth client of type **Web application**. Use only the `openid`, email, and profile scopes.
4. Add the production domain and any Vercel preview origins under **Authorized JavaScript origins**. Add the callback URI shown by Supabase under **Authorized redirect URIs**.
5. In Supabase **Authentication → Providers → Google**, enable Google and enter the client ID and secret.
6. In Supabase **Authentication → URL Configuration**, set the production Site URL and allow:
   - `http://localhost:5173/auth/callback`
   - `https://qr-box-storage.vercel.app/auth/callback`
   - the intended Vercel preview URL pattern
7. For email sign-in, enable email signup and email confirmations. Configure custom SMTP for external recipients, then apply `supabase/templates/sign-in-code.html` to both the Confirm signup and Magic link templates. Keep the `{{ .Token }}` variable in each. Set `VITE_EMAIL_AUTH_ENABLED=true` after verifying email delivery. Builds without it offer Google sign-in only. Use the intended Google OAuth audience for the release.
8. Deploy `photo-cleanup` and schedule a POST every five minutes from Supabase Cron. Set `PHOTO_CLEANUP_SECRET` as an Edge Function secret and store the same value in Vault for the scheduled `Authorization: Bearer …` header. Use the function URL `https://<project-ref>.supabase.co/functions/v1/photo-cleanup`. Monitor failures and the age of the oldest `photo_cleanup` row. See [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

Deploy the updated frontend after the migration because it uses the new invite RPC and photo reservation flow. Open app tabs should reload after the deploy.

Never put the Google client secret, Supabase secret/service-role key, or database password in a `VITE_` variable.

## Household signup

The public homepage offers signup and login. After verifying their email or signing in with Google, users can create one household from the app. Invite links open a sign-in flow and require the matching verified email. They expire after seven days and can be accepted once. Owners can transfer ownership in Settings, and users can delete their accounts at `/account/delete`.

## Enable the yearly Family plan

Free households have 10 active boxes, 2 members, and 10 photos. Family has 200 active boxes, 5 members, and 200 photos. The per-photo cap is 5 MiB on both plans. An expired subscription preserves existing records and applies the Free caps to new additions.

Use a Stripe sandbox before enabling live sales:

1. Create an active EUR 29 yearly recurring price and configure the Stripe customer portal for payment updates and cancellations at the end of the paid period, as described on `/cancellation-and-refunds`. Before enabling live checkout, configure applicable taxes and add an online withdrawal flow with a confirmation step and an emailed receipt, as required for eligible online consumer purchases in Malta. Link to the withdrawal flow from the cancellation and refunds page.
2. Set `APP_URL` (the exact web origin), `STRIPE_SECRET_KEY`, `STRIPE_FAMILY_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` as Supabase Edge Function secrets. Use the matching Stripe environment throughout. Keep these values out of Git and out of Vercel's public `VITE_` variables.
3. Deploy `household-billing` and `stripe-webhook`. Configure Stripe to send `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` to `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`.
4. Set `STRIPE_CHECKOUT_ENABLED=true` in that Supabase environment, set `VITE_BILLING_ENABLED=true` for its frontend, and redeploy. Verify sandbox checkout, plan activation, renewal and cancellation. Before public signup or paid launch, run the create/invite/QR/photo/delete smoke test on the intended host.

## Deploy with Vercel

The repository’s `vercel.json` rewrites deep links such as `/boxes/:id` and `/join/:token` to the React application.

```bash
vercel link --project qr-box-storage
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env add VITE_APP_URL production
vercel deploy
vercel deploy --prod
```

Keep `VITE_APP_URL` on the production host printed on existing labels. Point Vercel Preview to a separate staging Supabase project. Deploy a preview first, complete the smoke tests, and only then promote to production.

## Data and security behavior

- Users belong to one household in this version.
- Owners and members can manage boxes, current inventory, photos, locations, and categories.
- Only owners can create/revoke invitations or remove members; the final owner cannot be removed.
- Item changes go through `record_inventory_movement`, which locks balances and atomically applies add/remove/transfer operations.
- Archived boxes are hidden, their current stock is removed through history entries, and their historical movements remain available in Postgres.
- Photo objects use `<household>/<box>/<uuid>.<ext>` paths in a private bucket. Signed display URLs expire after five minutes. Uploads reserve a database row first. Archiving or deleting a photo queues the file for retryable cleanup.
- QR codes contain only the private box route. Scanning while signed out returns to the requested box after Google authentication.

## Backups and maintenance

- Enable Supabase point-in-time recovery or scheduled database backups appropriate to the subscription.
- Periodically test a restore into a separate project before treating backups as reliable.
- Keep Storage objects and the `photos` table together when exporting data.
- Run `npm audit`, frontend checks, database lint/tests, and Playwright before dependency or schema releases.
- Monitor Supabase Auth/Postgres/Storage logs and Vercel function/build logs after deployment.

## Troubleshooting

- **Google redirects to an error:** confirm the Google callback URI exactly matches the callback displayed in Supabase, then check the Supabase redirect allow list.
- **Signed in but no household:** create a household or open a valid invitation link while signed in with the invited email.
- **A location/category cannot be deleted:** it is referenced by a box. Rename it or move the boxes first.
- **A photo does not load:** confirm the `box-photos` bucket is private, migrations are current, and the signed URL request is made by a household member.
- **A QR link returns 404 on Vercel:** confirm `vercel.json` was included in the deployment.
- **Local database tests cannot connect:** start Docker Desktop, run `npx supabase start`, and retry.
