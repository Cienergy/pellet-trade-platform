# File uploads (internal)

This page documents the Supabase-backed upload paths used by buyer payment
proofs and Ops dispatch evidence. Treat it as the engineering reference when
changing upload endpoints, storage buckets, or UI submission flows.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Buyer payment proof upload | `pages/api/uploads/payment-proof.js` |
| Payment creation after proof upload | `pages/api/payments.js` |
| Buyer payment UI flow | `components/PayInvoiceForm.js` |
| Ops dispatch image upload | `pages/api/uploads/dispatch-image.js` |
| Ops dispatch and freight update | `pages/api/ops/dispatch.js` |
| Ops dispatch UI flow | `pages/ops/orders.js` |
| Dispatch timeline image display | `pages/api/ops/dispatch-timeline.js` |
| Persisted URLs | `prisma/schema.prisma` (`Payment.proofUrl`, `OrderBatch.dispatchImageUrl`) |

## Storage configuration

Uploads use Supabase Storage through `@supabase/supabase-js` with these
environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Create these buckets with the exact names expected by the API handlers:

| Bucket | Used for | URL returned by |
| --- | --- | --- |
| `payment-proof` | Buyer-uploaded invoice payment proof files | `POST /api/uploads/payment-proof` returns `proofUrl` |
| `dispatch-images` | Mandatory dispatch evidence uploaded by Ops/Admin | `POST /api/uploads/dispatch-image` returns `imageUrl` |

The current code stores the public URL returned by Supabase. Keep the buckets
public-read, or replace the API/UI flow with signed URL handling before making
them private.

## Buyer payment proof flow

1. `components/PayInvoiceForm.js` requires a file and the exact remaining
   invoice amount.
2. The UI submits `multipart/form-data` to `POST /api/uploads/payment-proof`.
3. The upload route requires an authenticated `BUYER` session.
4. The route loads the invoice and rejects access unless the invoice belongs to
   the buyer's organization. Batch-linked invoices use `batch.order.orgId`;
   standalone invoices such as security deposits use `invoice.orgId`.
5. The route uploads the file to the `payment-proof` bucket with a key shaped
   like `invoice_<invoiceId>_<timestamp>_<originalFilename>`.
6. The route returns `{ "proofUrl": "<public-url>" }`.
7. The UI then calls `POST /api/payments` with `invoiceId`, `amount`, `mode`,
   and `proofUrl`. Payment creation stores the URL on `Payment.proofUrl` and
   leaves the payment unverified until Finance/Admin approval.

Example upload request:

```bash
curl -X POST "https://app.example.com/api/uploads/payment-proof" \
  -b "session=<buyer-session-cookie>" \
  -F "invoiceId=<invoice-id>" \
  -F "file=@./proof.pdf"
```

Constraints:

- The upload endpoint only uploads the file; it does not create a `Payment`.
- `POST /api/payments` still enforces exact remaining amount, positive amount,
  and buyer invoice access.
- The accepted file types are not restricted by extension in the handler. The
  uploaded object's content type uses the browser-supplied MIME type or
  `application/octet-stream`.

## Ops dispatch image flow

1. `pages/ops/orders.js` requires an image before dispatch completion.
2. The UI submits `multipart/form-data` to `POST /api/uploads/dispatch-image`.
3. The upload route requires an authenticated `OPS` or `ADMIN` session.
4. The route uploads the file to the `dispatch-images` bucket with a key shaped
   like `dispatch_<batchId>_<timestamp>_<originalFilename>`.
5. The route returns `{ "imageUrl": "<public-url>" }`.
6. The UI calls `POST /api/ops/dispatch` with `batchId`, committed/supplied MT,
   optional freight fields, and `dispatchImageUrl`.
7. `POST /api/ops/dispatch` rejects missing or blank `dispatchImageUrl`, then
   stores it on `OrderBatch.dispatchImageUrl`, sets `dispatchedAt`, and sets
   `leftFromSiteAt` when it was not already set.
8. The UI completes the batch through `PATCH /api/batches/[batchId]/complete`.

Example upload request:

```bash
curl -X POST "https://app.example.com/api/uploads/dispatch-image" \
  -b "session=<ops-or-admin-session-cookie>" \
  -F "batchId=<batch-id>" \
  -F "file=@./dispatch.jpg"
```

Constraints:

- The dispatch upload endpoint does not validate that the batch exists; the
  dispatch API validates the batch when the returned URL is submitted.
- The image URL is what makes the dispatch event viewable on the dispatch
  timeline.
- Freight cost, when provided to `/api/ops/dispatch`, must be numeric and
  greater than or equal to zero.

## Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| `401 Unauthorized` | Missing or expired session cookie | Log in again and resend the upload with credentials. |
| `403 Forbidden` on payment proof upload | Buyer is trying to upload against another organization's invoice | Check `session.orgId` and the invoice owner from `batch.order.orgId` or `invoice.orgId`. |
| `400 invoiceId and file required` / `batchId and file required` | Missing multipart fields | Ensure the form field names are exactly `invoiceId` or `batchId`, plus `file`. |
| `503 File upload service not configured` on dispatch image upload | Missing or invalid Supabase env vars | Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the runtime environment. |
| Supabase `Bucket not found` or image link 404 | Bucket missing, misspelled, or not public-readable | Create `payment-proof` and `dispatch-images`; keep public reads enabled for current UI links. |
| Payment proof route fails during startup | Supabase env vars are absent where the route is loaded | Unlike the dispatch image route, the payment proof route constructs the Supabase client at module load. Configure the env vars before using buyer proof uploads. |
