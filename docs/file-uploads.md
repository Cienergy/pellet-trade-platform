# File uploads and storage (internal)

This page documents the active file upload paths used by payment proof and
dispatch evidence workflows. Treat it as the engineering runbook when changing
Supabase storage setup, upload APIs, or downstream payment/dispatch flows.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Payment proof UI flow | `components/PayInvoiceForm.js` |
| Payment proof upload API | `pages/api/uploads/payment-proof.js` |
| Payment record creation | `pages/api/payments.js` |
| Dispatch image UI flow | `pages/ops/orders.js` |
| Dispatch image upload API | `pages/api/uploads/dispatch-image.js` |
| Dispatch metadata update | `pages/api/ops/dispatch.js` |
| Batch completion after dispatch | `pages/api/batches/[batchId]/complete.js` |
| Dispatch timeline image display | `pages/api/ops/dispatch-timeline.js` |
| Deprecated receipt endpoints | `pages/api/payments/[paymentId]/receipt.js`, `pages/api/invoices/receipts/[paymentId].js` |

## Architecture

- Upload APIs accept `multipart/form-data` and disable the Next.js body parser.
- File bytes are written to Supabase Storage. The app stores the returned public
  URL on a payment or batch-related record; it does not store file bytes in
  Postgres.
- Active upload handlers do not provide a local filesystem fallback. Supabase
  credentials and buckets must exist in every environment that exercises these
  workflows.
- Bucket names are hard-coded:
  - `payment-proof`
  - `dispatch-images`
- The handlers call `getPublicUrl(...)`, so the buckets must allow public reads
  unless the code is changed to use signed URLs.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only configuration. Do not expose it to
  browser code.

## Environment setup

Set these environment variables in local `.env` files and hosted environments
such as Vercel:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Create the two Supabase Storage buckets exactly as named above. If public access
is disabled, uploaded objects may be stored successfully while "view" links fail
because the returned URL is not readable by users.

## Payment proof flow

The buyer payment proof flow is a two-step client operation:

1. `components/PayInvoiceForm.js` posts `invoiceId` and `file` to
   `POST /api/uploads/payment-proof`.
2. The upload API:
   - requires an authenticated `BUYER`;
   - loads the invoice and checks `buyerCanAccessInvoice(session, invoice)`;
   - uploads the file to the `payment-proof` bucket using the object name
     `invoice_${invoiceId}_${Date.now()}_${originalFilename || "payment-proof"}`;
   - returns `{ proofUrl }`.
3. The client posts `invoiceId`, exact remaining `amount`, `mode`, and
   `proofUrl` to `POST /api/payments`.
4. `pages/api/payments.js` validates buyer invoice access, rejects partial or
   excess amounts, and creates an unverified `Payment` row.

Important constraints:

- The UI accepts image files and PDFs, but server-side validation currently only
  requires a parsed file and uses the uploaded file's `mimetype` when sending it
  to Supabase.
- `POST /api/payments` requires `proofUrl`; payment creation is not attempted
  until the upload step succeeds.
- If the upload succeeds but payment creation fails, the current code does not
  delete the uploaded object from Supabase.

## Dispatch image flow

The Ops dispatch flow also uses a separate upload step before writing business
state:

1. `pages/ops/orders.js` requires an image before enabling dispatch completion.
2. The page posts `batchId` and `file` to `POST /api/uploads/dispatch-image`.
3. The upload API:
   - requires an authenticated `OPS` or `ADMIN`;
   - returns `503` when `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing
     or invalid;
   - uploads the file to the `dispatch-images` bucket using the object name
     `dispatch_${batchId}_${Date.now()}_${originalFilename || "dispatch-image"}`;
   - returns `{ imageUrl }`.
4. The page posts `dispatchImageUrl`, committed/supplied MT, and optional freight
   fields to `POST /api/ops/dispatch`.
5. `pages/api/ops/dispatch.js` requires a non-empty `dispatchImageUrl`, stores
   dispatch metadata, sets `dispatchedAt`, sets `leftFromSiteAt` if it was not
   already set, and writes audit entries.
6. The page then calls `PATCH /api/batches/[batchId]/complete` to mark the batch
   complete and evaluate whether the parent order is complete.

The dispatch timeline includes the stored `dispatchImageUrl` on the
`DISPATCHED` event, so bucket visibility affects timeline image viewing.

## Deprecated receipt endpoints

The legacy receipt endpoints now return `410 Gone`:

- `GET /api/payments/[paymentId]/receipt`
- `GET /api/invoices/receipts/[paymentId]`

Use the in-app invoice and payment views instead of adding new callers to these
routes.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Dispatch upload returns `503 File upload service not configured` | Missing or invalid Supabase environment variables | Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then restart or redeploy |
| Upload returns a Supabase `Bucket not found` error | Bucket name is missing or misspelled | Create `dispatch-images` and `payment-proof` exactly |
| Upload succeeds but image/proof URL cannot be opened | Bucket is private or public read policy is missing | Make the bucket public or implement signed URL generation |
| Buyer cannot upload proof for an invoice | Invoice is not visible to the buyer's organization | Check `buyerCanAccessInvoice` and invoice organization/batch/order links |
| Dispatch cannot complete | The dispatch image upload or `/api/ops/dispatch` step failed | Complete the upload first, then retry dispatch before calling batch completion |

## Maintenance notes

- If bucket names become configurable, update both upload handlers and this
  runbook together.
- If buckets become private, replace `getPublicUrl(...)` consumers with a signed
  URL flow and update dispatch timeline rendering.
- Keep upload role gates aligned with `docs/rbac.md`: payment proof is buyer
  scoped; dispatch evidence is Ops/Admin only.
