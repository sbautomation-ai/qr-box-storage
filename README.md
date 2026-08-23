# QR Box Storage

A private, shared household inventory for QR-labelled storage boxes. Family members sign in with Google, search boxes and their contents, record additions/removals/transfers, attach private photos, and print QR labels that reopen the correct box after authentication.

## Architecture

- React 19, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, and accessible Radix dialogs.
- Supabase Auth, Postgres, Row Level Security, transactional RPCs, and private Storage.
- Vercel static hosting with SPA route rewrites.
- Vitest/Testing Library, pgTAP/Supabase CLI, and Playwright verification.

The browser receives only a Supabase project URL and publishable key. Those values identify the backend but do not authorize data access; all household boundaries and owner-only operations are enforced by RLS and database functions.

## Prerequisites

- Node.js 22+
- Docker Desktop for the local Supabase stack
- A Supabase account and project for deployment
- A Google Cloud project with an OAuth web client
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

Google OAuth is disabled in `supabase/config.toml` by default so database tests work without secrets. For a full local OAuth flow, create a Google web client, enable the local Google provider, and place its secret in an untracked environment file. Alternatively, point `.env.local` at a configured hosted Supabase development project.

Useful checks:

```bash
npm run check
npx supabase db lint --local --level warning
npx supabase test db
npm run test:e2e
```

## Create the hosted backend

1. Create a new Supabase project and note its project reference, URL, and publishable key.
2. Link and migrate it:

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
7. Restrict the Google OAuth audience to the intended family accounts while testing. Publish the consent screen only when ready.

Never put the Google client secret, Supabase secret/service-role key, or database password in a `VITE_` variable.

## Bootstrap the first owner

There is deliberately no “first user wins” behavior.

1. Sign in with the intended owner’s Google account. The app displays their Supabase user UUID on the **Household access required** screen.
2. In the Supabase SQL Editor, run:

   ```sql
   select public.bootstrap_household(
     'PASTE-OWNER-USER-UUID-HERE'::uuid,
     'Family Home'
   );
   ```

3. Refresh the app. The owner can now add locations/categories and invite other family members from Settings.

Invitation links are restricted to the entered Google email, expire after seven days, and are single use. Full tokens are intentionally not stored in readable database columns, so copy the link when it is created.

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

Use `https://qr-box-storage.vercel.app` for `VITE_APP_URL`. Add equivalent variables for Preview if previews should connect to the backend. Deploy a preview first, complete the smoke tests, and only then promote to production.

## Data and security behavior

- Users belong to one household in this version.
- Owners and members can manage boxes, current inventory, photos, locations, and categories.
- Only owners can create/revoke invitations or remove members; the final owner cannot be removed.
- Item changes go through `record_inventory_movement`, which locks balances and atomically applies add/remove/transfer operations.
- Archived boxes are hidden, their current stock is removed through history entries, and their historical movements remain available in Postgres.
- Photo objects use `<household>/<box>/<uuid>.<ext>` paths in a private bucket. Signed display URLs expire after one hour.
- QR codes contain only the private box route. Scanning while signed out returns to the requested box after Google authentication.

## Backups and maintenance

- Enable Supabase point-in-time recovery or scheduled database backups appropriate to the subscription.
- Periodically test a restore into a separate project before treating backups as reliable.
- Keep Storage objects and the `photos` table together when exporting data.
- Run `npm audit`, frontend checks, database lint/tests, and Playwright before dependency or schema releases.
- Monitor Supabase Auth/Postgres/Storage logs and Vercel function/build logs after deployment.

## Troubleshooting

- **Google redirects to an error:** confirm the Google callback URI exactly matches the callback displayed in Supabase, then check the Supabase redirect allow list.
- **Signed in but no household:** bootstrap the owner or open a valid invitation link while signed in with the invited email.
- **A location/category cannot be deleted:** it is referenced by a box. Rename it or move the boxes first.
- **A photo does not load:** confirm the `box-photos` bucket is private, migrations are current, and the signed URL request is made by a household member.
- **A QR link returns 404 on Vercel:** confirm `vercel.json` was included in the deployment.
- **Local database tests cannot connect:** start Docker Desktop, run `npx supabase start`, and retry.
