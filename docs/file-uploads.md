# File uploads (internal)

This page documents the Supabase-backed upload paths used by buyer payment
proofs and Ops dispatch images. Treat it as the engineering reference when
changing upload buckets, role gates, or the payment/dispatch UI flows.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Buyer payment proof upload API | `pages/api/uploads/payment-proof.js` |
| Buyer payment submission API | `pages/api/payments.js` |
| Buyer payment UI | `components/PayInvoiceForm.js` |
| Ops dispatch image upload API | `pages/api/uploads/dispatch-image.js` |
| Ops dispatch metadata API | `pages/api/ops/dispatch.js` |
| Ops dispatch UI | `pages/ops/orders.js` |
| Dispatch timeline image display | `pages/api/ops/dispatch-timeline.js`, `pages/ops/dispatch-timeline.js` |
| Invoice organization scoping | `lib/invoiceAccess.js` |
| Stored upload references | `prisma/schema.prisma` (`Payment.proofUrl`, `OrderBatch.dispatchImageUrl`) |

## Configuration

Both upload APIs use Supabase Storage with the service role key:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Required buckets:

| Bucket | Used by | Public URL returned as |
| --- | --- | --- |
| `payment-proof` | Buyer payment proof uploads | `proofUrl` |
| `dispatch-images` | Ops/Admin dispatch image uploads | `imageUrl` |

The APIs call `getPublicUrl`, so uploaded files must be readable by the users
who later open proof or dispatch image links. In the current deployment guide
and README this is represented as public buckets. If bucket policies are made
private later, replace this flow with signed URL generation before changing the
bucket visibility.

## Buyer payment proof flow

1. `components/PayInvoiceForm.js` requires a file before the buyer can submit
   payment.
2. The component posts `multipart/form-data` to
   `POST /api/uploads/payment-proof` with:
   - `invoiceId`
   - `file`
3. The upload API is guarded by `requireAuth(requireRole("BUYER", handler))`.
4. The API loads the invoice with its batch and order, then calls
   `buyerCanAccessInvoice(session, invoice)` so BUYER users can only upload
   proof for invoices in their own organization.
5. The file is uploaded to `payment-proof` using a key shaped like:

   ```text
   invoice_<invoiceId>_<timestamp>_<original filename or payment-proof>
   ```

6. The response is:

   ```json
   { "proofUrl": "https://..." }
   ```

7. The UI then calls `POST /api/payments` with `invoiceId`, exact remaining
   `amount`, `mode`, and the returned `proofUrl`.

Payment proof upload does not create a `Payment` record by itself. The payment
record is only created by `pages/api/payments.js`, which also re-checks buyer
invoice access and rejects partial or excess amounts.

## Ops dispatch image flow

1. `pages/ops/orders.js` requires an image before an Ops/Admin user can dispatch
   and complete a batch.
2. The UI posts `multipart/form-data` to
   `POST /api/uploads/dispatch-image` with:
   - `batchId`
   - `file`
3. The upload API is guarded by
   `requireAuth(requireRole(["OPS", "ADMIN"], handler))`.
4. The file is uploaded to `dispatch-images` using a key shaped like:

   ```text
   dispatch_<batchId>_<timestamp>_<original filename or dispatch-image>
   ```

5. The response is:

   ```json
   { "imageUrl": "https://..." }
   ```

6. The UI then calls `POST /api/ops/dispatch` with the returned
   `dispatchImageUrl`, committed/supplied quantities, and optional freight
   fields.
7. `POST /api/ops/dispatch` refuses blank `dispatchImageUrl`, stores it on
   `OrderBatch.dispatchImageUrl`, sets `dispatchedAt`, sets `leftFromSiteAt`
   when it was not already present, and logs the dispatch action.
8. The UI calls `PATCH /api/batches/[batchId]/complete` after dispatch metadata
   is saved.

The dispatch timeline returns the stored `dispatchImageUrl` on the
`DISPATCHED` event, and the Ops timeline page renders it as a `View image` link.

## Operational notes and pitfalls

- Create both buckets before enabling upload-heavy testing. Missing buckets
  surface as Supabase upload errors; the dispatch image endpoint returns the
  Supabase error message in a 500 response.
- `POST /api/uploads/dispatch-image` validates Supabase configuration and
  returns 503 when `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing or
  invalid.
- `POST /api/uploads/payment-proof` constructs the Supabase client at module
  load, so both Supabase environment variables are required anywhere buyer
  payment proof uploads are exercised.
- There is no local filesystem fallback for these two current upload routes.
  `pages/api/_supabase.js` contains older local JSON helpers, but these APIs do
  not use them.
- API routes disable the default Next.js body parser and parse
  `multipart/form-data` with `formidable`; JSON requests to upload endpoints are
  not supported.
- Temporary files are removed after successful upload. The dispatch image route
  also attempts cleanup on upload and processing errors.
- Payment proof accepts images or PDFs from the UI. Dispatch images default to
  `image/jpeg` when the uploaded file has no MIME type.
