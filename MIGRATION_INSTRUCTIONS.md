# Production Migration Instructions

## Migration: `add_contracts_dispatch_gst_features`

This migration adds:
- Contract pricing models
- Dispatch tracking with image uploads
- Committed/supplied volume tracking
- Enhanced GST calculation (CGST/SGST/IGST)
- Payment terms (NET_30, NET_60, NET_90)
- Margin data placeholders

## Production Deployment Steps

### Option 1: Using the Migration Script (Recommended)

```bash
chmod +x scripts/apply-migration-production.sh
./scripts/apply-migration-production.sh
```

### Option 2: Manual Application

1. **Apply the migration SQL directly:**
   ```bash
   psql $DATABASE_URL -f prisma/migrations/20250120000000_add_contracts_dispatch_gst_features/migration.sql
   ```

2. **Mark migration as applied:**
   ```bash
   npx prisma migrate resolve --applied 20250120000000_add_contracts_dispatch_gst_features
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

### Option 3: Using Prisma Migrate Deploy (Production)

```bash
npx prisma migrate deploy
```

This command applies all pending migrations without using a shadow database (production-safe).

## Verification

After applying the migration, verify the changes:

```sql
-- Check PaymentTerm enum exists
SELECT enum_range(NULL::"PaymentTerm");

-- Check Contract table exists
SELECT COUNT(*) FROM "Contract";

-- Check new columns on OrderBatch
SELECT "committedMT", "suppliedMT", "dispatchImageUrl", "dispatchedAt", "batchMargin" 
FROM "OrderBatch" LIMIT 1;

-- Check new columns on Invoice
SELECT "cgst", "sgst", "igst", "paymentTerm", "syncedToERP" 
FROM "Invoice" LIMIT 1;

-- Check buyerMargin on Organization
SELECT "buyerMargin" FROM "Organization" LIMIT 1;
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop Contract table
DROP TABLE IF EXISTS "Contract";

-- Remove columns from Invoice
ALTER TABLE "Invoice" 
  DROP COLUMN IF EXISTS "cgst",
  DROP COLUMN IF EXISTS "sgst",
  DROP COLUMN IF EXISTS "igst",
  DROP COLUMN IF EXISTS "paymentTerm",
  DROP COLUMN IF EXISTS "syncedToERP";

-- Remove columns from OrderBatch
ALTER TABLE "OrderBatch"
  DROP COLUMN IF EXISTS "committedMT",
  DROP COLUMN IF EXISTS "suppliedMT",
  DROP COLUMN IF EXISTS "dispatchImageUrl",
  DROP COLUMN IF EXISTS "dispatchedAt",
  DROP COLUMN IF EXISTS "batchMargin";

-- Remove column from Organization
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "buyerMargin";

-- Drop PaymentTerm enum
DROP TYPE IF EXISTS "PaymentTerm";
```

## Post-Migration Tasks

1. **Create Supabase Storage Bucket for Dispatch Images:**
   - Bucket name: `dispatch-images`
   - Make it public or configure appropriate access policies

2. **Update Environment Variables (if needed):**
   - Ensure `DATABASE_URL` is set correctly
   - Verify Supabase credentials for file uploads

3. **Test New Features:**
   - Contract creation via `/api/admin/contracts`
   - Dispatch tracking via `/api/ops/dispatch`
   - Consumption patterns via `/api/buyer/consumption-patterns`
   - Dispatch timelines via `/api/ops/dispatch-timeline`

## Notes

- The migration uses `DEFAULT 'NET_30'` for existing invoices
- All new GST fields are nullable to handle existing data
- The migration is idempotent-safe (can be run multiple times with IF EXISTS checks)

