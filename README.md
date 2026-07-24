# UK Store — Surat commerce build

A responsive Next.js commerce application for a Surat-only delivery service. The primary database is Supabase PostgreSQL and product images are stored in Supabase Storage.

## Included

- Separate landing page (`/`) and searchable shop (`/shop`) with mobile category navigation and cart.
- Customer registration/login, saved named addresses (Home, Office, etc.), manual checkout address entry, order history, and passkeys.
- Surat-only checkout and postal-code validation (`394xxx` or `395xxx`).
- Privacy-aware tracking: public tracking stays available, but a rider phone number is exposed only to the authenticated customer who owns the order after a rider is assigned.
- Rider queue tabs for Assigned, Picked up, On the way, Delivered, Failed and all recent work.
- COD cash collection confirmation with server-side amount verification.
- Admin Overview with PDF/Excel export and selectable textual data and/or diagrams.
- Admin Products category filters plus category creation.
- Admin Orders status tabs for Placed, Confirmed, Packing, Ready, Out for delivery, Delivered and Cancelled.
- Admin Users, inventory, staff, rider assignment, GPS history and audit views.
- Supabase Storage product-image upload; profile photos are not used anywhere in the app—user initials are shown instead.
- Animated responsive storefront and staff navigation.

## Install

```powershell
Copy-Item .env.example .env.local
notepad .env.local
npm install
npm run db:migrate
npm run db:seed
npm run db:bootstrap
npm run dev
```

The app treats `SUPABASE_DATABASE_URL` as the primary database connection. `DATABASE_URL` is only retained as a compatibility fallback in application code while older installations are being migrated.

## Move an existing PostgreSQL database to Supabase

Back up both databases first. Configure these values in `.env.local`:

```env
SOURCE_DATABASE_URL=postgresql://...old database...
SOURCE_DATABASE_SSL=false
SUPABASE_DATABASE_URL=postgresql://...Supabase Postgres connection...
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=product-images
```

Then run:

```powershell
npm run db:migrate-to-supabase
```

The migrator applies the schema to Supabase, copies application rows while preserving IDs, repairs serial sequences, uploads legacy `media_assets` files to Supabase Storage, and rewrites matching product image URLs. It refuses to copy over a non-empty Supabase application database by default. `SUPABASE_MIGRATION_REPLACE_TARGET=true` enables destructive replacement and should only be used intentionally after a backup.

After migration, keep `SUPABASE_DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` configured on the deployed server. `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.

## Customer addresses

Signed-in customers can manage named addresses from `/account`. Checkout displays saved addresses first and also offers **Use another address**. A manually entered address can optionally be saved under a name such as Home, Office, Parents, or Warehouse. The server verifies address ownership instead of trusting the address data sent by the browser.

## Passkeys

Customers manage passkeys from `/account`. Admin and delivery accounts use `/security`, also linked from their responsive navigation. Password login remains available.

Development on `localhost` works with:

```env
PASSKEY_RP_ID=localhost
PASSKEY_ORIGIN=http://localhost:3000
```

For production, set `PASSKEY_RP_ID` to the deployed hostname without a scheme and set `PASSKEY_ORIGIN` to the exact HTTPS origin.

## Product images

Admin uploads use Supabase Storage and return public URLs stored in `products.image_url`. The default bucket is `product-images`; change it with `SUPABASE_STORAGE_BUCKET`. Accepted formats are JPG, PNG, WebP and AVIF, up to 5 MB.

The legacy `/api/media/[id]` route is left only for pre-migration compatibility. New uploads do not write image bytes into PostgreSQL.

## Tracking privacy

Anyone with a tracking code can see normal order and delivery status. A delivery partner phone number is included only when all of these are true: a rider is assigned, the viewer is signed in as a customer, and that signed-in account owns the order. This check is performed by the tracking API.

## Admin overview export

Open **Admin → Overview → Export overview**. Choose PDF or Excel, then select **Textual data**, **Diagrams**, or both. Diagram exports capture the live overview charts shown on screen.

## URLs

- Shop: `http://localhost:3000/shop`
- Customer registration: `http://localhost:3000/register`
- Login: `http://localhost:3000/login`
- Customer account: `http://localhost:3000/account`
- Staff passkey security: `http://localhost:3000/security`
- Admin: `http://localhost:3000/admin`
- Delivery rider: `http://localhost:3000/delivery`
- Tracking: `http://localhost:3000/track`

## Production checklist

- Use HTTPS for passkeys and rider geolocation.
- Set `APP_URL`, `PASSKEY_RP_ID`, and `PASSKEY_ORIGIN` to the exact deployed site values.
- Keep `.env.local` and the Supabase service-role key out of Git/client bundles.
- Enable Supabase database backups appropriate to the deployment.
- Use a compliant OpenStreetMap-compatible tile provider for production traffic and preserve attribution.
- Add reverse-proxy/API-gateway rate limiting for login, registration, checkout, tracking and upload endpoints.
- Add monitoring for `/api/health` and failed migrations/uploads.

## Validation

After dependencies are installed:

```powershell
npm run lint
npm run build
```
