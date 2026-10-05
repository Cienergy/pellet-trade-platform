# File uploads (internal)

This page documents the Supabase Storage-backed upload paths used by payment
proof review and Ops dispatch. Treat it as the runbook when changing upload
buckets, route access, or public file links.

## Source of truth

| Concern | Codepath |
| --- | --- |
| Buyer payment proof upload | `pages/api/uploads/payment-proof.js` |
| Payment submission | `pages/api/payments.js` |
| Payment review | `pages/api/payments/[paymentId]/verify.js`, `pages/api/finance/payments.js` |
| Dispatch image upload | `pages/api/uploads/dispatch-image.js` |
| Dispatch metadata | `pages/api/ops/dispatch.js` |
| Dispatch timeline image links | `pages/api/ops/dispatch-timeline.js` |
| Invoice ownership checks | `lib/invoiceAccess.js` |

## Required storage setup

Set these environment variables anywhere uploads are enabled:

```text
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Create these Supabase Storage buckets:

| Bucket | Producer | Stored URL field | Reader |
| --- | --- | --- | --- |
| `payment-proof` | `POST /api/uploads/payment-proof` | `Payment.proofUrl` | Finance payment review page |
| `dispatch-images` | `POST /api/uploads/dispatch-image` | `OrderBatch.dispatchImageUrl` | Ops dispatch timeline |

Both handlers call `getPublicUrl`, and the UI opens the returned URL directly.
Use public-read buckets unless the UI is changed to issue signed URLs.

## Payment proof flow

1. Buyer opens an invoice and selects a proof image or PDF.
2. UI posts multipart form data to `POST /api/uploads/payment-proof`:
   - `invoiceId`: invoice id
   - `file`: uploaded proof file
3. The upload handler:
   - requires a BUYER session,
   - loads the invoice with its batch order,
   - uses `buyerCanAccessInvoice` so buyers can only upload proofs for their
     own organization,
   - uploads to the `payment-proof` bucket with a filename shaped like
     `invoice_<invoiceId>_<timestamp>_<original-name>`,
   - returns `{ "proofUrl": "<public-url>" }`.
4. UI posts `POST /api/payments` with `invoiceId`, exact remaining `amount`,
   `mode`, and the returned `proofUrl`.
5. Finance approves or rejects the payment through
   `POST /api/payments/[paymentId]/verify`.

Constraints:

- `POST /api/payments` only allows BUYER users.
- The amount must equal the invoice remaining amount within `0.01`; arbitrary
  partial or excess payments are rejected.
- Only verified payments reduce the remaining amount and affect invoice payment
  status.
- The finance pending-payment list currently reads unverified payments for
  batch-backed invoices from non-rejected orders.

Example payment submission after upload:

```json
{
  "invoiceId": "inv_123",
  "amount": 11800,
  "mode": "NEFT",
  "proofUrl": "https://<project>.supabase.co/storage/v1/object/public/payment-proof/invoice_inv_123_..."
}
```

## Dispatch image flow

1. Ops selects a batch to complete and provides a dispatch image.
2. UI posts multipart form data to `POST /api/uploads/dispatch-image`:
   - `batchId`: batch id
   - `file`: uploaded dispatch image
3. The upload handler:
   - requires OPS or ADMIN,
   - returns `503` when `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is not
     configured,
   - uploads to the `dispatch-images` bucket with a filename shaped like
     `dispatch_<batchId>_<timestamp>_<original-name>`,
   - returns `{ "imageUrl": "<public-url>" }`.
4. UI posts `POST /api/ops/dispatch` with batch metrics, optional freight
   fields, and the returned `dispatchImageUrl`.
5. UI then calls `PATCH /api/batches/[batchId]/complete`.

Constraints:

- `POST /api/ops/dispatch` requires a non-empty `dispatchImageUrl`.
- `freightCost`, when present, must be numeric and greater than or equal to `0`.
- Dispatch records `dispatchedAt` and sets `leftFromSiteAt` when it was not
  already set.
- Dispatch timeline responses include the stored image URL on `DISPATCHED`
  events.

Example dispatch metadata after upload:

```json
{
  "batchId": "batch_123",
  "committedMT": 10,
  "suppliedMT": 9.8,
  "freightCost": 2500,
  "freightCurrency": "INR",
  "dispatchImageUrl": "https://<project>.supabase.co/storage/v1/object/public/dispatch-images/dispatch_batch_123_..."
}
```

## Deprecated receipt routes

These legacy receipt endpoints are intentionally disabled and return `410`:

- `GET /api/payments/[paymentId]/receipt`
- `GET /api/invoices/receipts/[paymentId]`

Use in-app invoice/payment views and the stored `proofUrl` instead of adding
new callers to those routes.

## Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Dispatch image upload returns `503` | Supabase env vars missing or invalid | Confirm both vars are set and `SUPABASE_URL` starts with `http`. |
| Upload returns `Bucket not found` | Storage bucket missing or named differently | Create `payment-proof` or `dispatch-images` exactly. |
| Link opens to 404 or access error | Bucket is not public-read | Make the bucket public, or implement signed URL generation before making it private. |
| Buyer gets `403` on payment proof upload | Invoice belongs to another org or lacks an owning org | Check `batch.order.orgId`, standalone `invoice.orgId`, and the buyer session `orgId`. |
| Payment submission fails after upload | Amount does not match remaining invoice amount | Re-fetch the invoice and submit the exact remaining amount. |
