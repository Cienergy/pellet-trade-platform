# File uploads (internal)

This page documents the Supabase-backed file upload paths used by payment proof
and dispatch image workflows. Treat it as the engineering reference when
changing upload routes, storage buckets, or UI flows that persist file URLs.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Supabase environment variables | `lib/supabaseServer.js`, upload API routes |
| Buyer payment proof upload | `pages/api/uploads/payment-proof.js` |
| Payment submission using uploaded proof URL | `pages/api/payments.js`, `components/PayInvoiceForm.js` |
| Finance proof review | `pages/finance/payments.js`, `pages/api/payments/[paymentId]/verify.js` |
| Ops dispatch image upload | `pages/api/uploads/dispatch-image.js` |
| Dispatch metadata using uploaded image URL | `pages/api/ops/dispatch.js`, `pages/ops/orders.js` |
| Dispatch timeline image links | `pages/api/ops/dispatch-timeline.js`, `pages/ops/dispatch-timeline.js` |
| Persisted URL fields | `prisma/schema.prisma` (`Payment.proofUrl`, `OrderBatch.dispatchImageUrl`) |

## Storage configuration

Uploads require a Supabase project with Storage enabled and these environment
variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Create both buckets before enabling the upload workflows:

| Bucket | Written by | URL stored in | Expected reader |
| --- | --- | --- | --- |
| `payment-proof` | `POST /api/uploads/payment-proof` | `Payment.proofUrl` | Finance/Admin payment review UI |
| `dispatch-images` | `POST /api/uploads/dispatch-image` | `OrderBatch.dispatchImageUrl` | Ops dispatch timeline UI |

The upload handlers call `getPublicUrl`, and the UI opens those links directly
in a browser tab. In the current implementation, buckets should be public-read
unless Supabase policies are changed along with the UI/API to generate signed
URLs.

## Buyer payment proof flow

1. Buyer opens an unpaid invoice in `PayInvoiceForm`.
2. The UI requires a proof file and posts multipart form data to
   `POST /api/uploads/payment-proof`.
3. The upload route requires:
   - authenticated `BUYER` session,
   - `invoiceId` field,
   - `file` field,
   - buyer org access to the invoice via `buyerCanAccessInvoice`.
4. The route writes the file to the `payment-proof` bucket with a key shaped
   like `invoice_<invoiceId>_<timestamp>_<originalFilename>`.
5. The route returns `{ proofUrl }`.
6. The UI posts `invoiceId`, exact remaining `amount`, `mode`, and `proofUrl`
   to `POST /api/payments`.
7. Finance/Admin users review `Payment.proofUrl` from the finance payments
   screen before approving or rejecting the payment.

Constraints:

- Payment submission rejects missing `proofUrl`; direct payment records without
  proof are not part of the buyer flow.
- Payment amount must exactly match the invoice remaining amount. Partial and
  excess payments are rejected by both UI validation and `pages/api/payments.js`.
- The upload step stores only the public URL. File metadata such as MIME type,
  original name, and bucket key are not persisted separately.

## Ops dispatch image flow

1. Ops/Admin opens the dispatch modal from `pages/ops/orders.js`.
2. The UI requires a dispatch image before dispatching and completing a batch.
3. The UI posts multipart form data to `POST /api/uploads/dispatch-image`.
4. The upload route requires:
   - authenticated `OPS` or `ADMIN` session,
   - `batchId` field,
   - `file` field,
   - configured Supabase URL and service role key.
5. The route writes the file to the `dispatch-images` bucket with a key shaped
   like `dispatch_<batchId>_<timestamp>_<originalFilename>`.
6. The route returns `{ imageUrl }`.
7. The UI posts dispatch metadata, freight fields, committed/supplied MT, and
   `dispatchImageUrl` to `POST /api/ops/dispatch`.
8. `POST /api/ops/dispatch` rejects missing or blank `dispatchImageUrl`, stores
   it on `OrderBatch.dispatchImageUrl`, and sets `dispatchedAt`.
9. The UI then calls `PATCH /api/batches/[batchId]/complete`.

Dispatch timeline responses include `imageUrl` on `DISPATCHED` events, sourced
from `OrderBatch.dispatchImageUrl`.

## Operational troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Upload returns a Supabase error such as "Bucket not found" | Bucket was not created or the name differs | Create `payment-proof` and `dispatch-images` exactly as named. |
| Upload route fails before returning JSON | Missing or invalid Supabase env vars | Confirm `SUPABASE_URL` starts with `https://` and `SUPABASE_SERVICE_ROLE_KEY` is set in the runtime environment. |
| Finance can see a payment but "View Proof" fails | Stored URL points to a private or missing object | Check bucket public-read policy or migrate the app to signed URL reads. |
| Dispatch modal refuses to continue | No image selected or upload failed | Select an image and confirm `POST /api/uploads/dispatch-image` succeeds before `POST /api/ops/dispatch`. |
| Dispatch timeline shows no image link | `OrderBatch.dispatchImageUrl` was not stored | Check the dispatch API request body and audit log action `dispatched`. |

## Implementation notes

- Upload routes disable Next.js body parsing because they parse multipart form
  data with `formidable`.
- Temporary files are read from the local filesystem and removed after
  successful uploads. The dispatch image route also attempts cleanup on upload
  and processing errors.
- The server uses `SUPABASE_SERVICE_ROLE_KEY`, so never expose it to browser
  code or `NEXT_PUBLIC_*` variables.
- Legacy receipt download endpoints now return HTTP 410 and are not part of the
  upload workflow.
