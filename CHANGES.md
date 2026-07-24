# UK Store update

## Storefront redesign

- Reworked the customer-facing site around the supplied UK Store reference: black announcement strip, green Surat branding, delivery-location header, prominent catalog search, desktop category navigation, responsive animated mobile menu, green retail cards, and compact local-commerce layouts.
- Rebuilt the home page with the “Everything Surat Needs, Delivered in 2 Hrs or Less!” hero, category rail, service benefits, Surat-only positioning, and local-store trust section.
- Updated shop, cart drawer, product detail, checkout, account, login, registration, tracking, and footer styling without changing their data/API behavior.
- Header search now routes directly into the existing shop search; category links route into the existing category filter; cart access remains available from the shared header.
- Kept admin and delivery operations intact while making shared branding compatible with their dark portal shell.
- Kept Leaflet below application dialogs to prevent maps from overlapping modals.

- Added named customer address storage with default-address support, address management in `/account`, saved-address selection at checkout, manual entry, and optional save-on-checkout.
- Added server-side saved-address ownership validation so a customer cannot submit another user's address ID.
- Switched the application database configuration to Supabase PostgreSQL (`SUPABASE_DATABASE_URL`) with a legacy `DATABASE_URL` fallback.
- Added `npm run db:migrate-to-supabase` to copy an existing PostgreSQL installation to Supabase, preserve IDs, repair sequences, move legacy database image blobs into Supabase Storage, and rewrite product image URLs.
- Replaced new database-backed image uploads with Supabase Storage uploads.
- Removed profile-photo UI and replaced it with user initials throughout the storefront/admin/delivery shells.
- Replaced generic login validation messages with field-specific validation errors.
- Added discoverable WebAuthn/passkey registration and sign-in. Customers manage passkeys from `/account`; admin/delivery users use `/security`.
- Changed tracking privacy so the assigned rider phone number is returned only to the authenticated customer who owns that order.
- Animated the responsive storefront and staff navigation drawers.
- Added delivery queue tabs for Queue, Assigned, Picked up, On the way, Delivered, Failed and All, with recent completed/failed deliveries retained in the rider feed.
- Changed Admin Orders filters from product categories to order-status categories (Placed, Confirmed, Packing, Ready, Out for delivery, Delivered and Cancelled).
- Added Admin Overview export with PDF/Excel format selection and independent textual-data/diagram options.
- Preserved existing shop/cart behavior while refreshing the customer-facing visual system.
