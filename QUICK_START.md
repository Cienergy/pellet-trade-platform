# Quick Start Guide - New Features

## 🚀 Deployment Steps

### 1. Apply Database Migration

**Option A: Using npm script (Recommended)**
```bash
npm run prisma:migrate
```

**Option B: Using migration script**
```bash
./scripts/apply-migration-production.sh
```

**Option C: Manual application**
```bash
# Apply migration SQL
psql $DATABASE_URL -f prisma/migrations/20250120000000_add_contracts_dispatch_gst_features/migration.sql

# Mark as applied
npx prisma migrate resolve --applied 20250120000000_add_contracts_dispatch_gst_features
```

### 2. Generate Prisma Client
```bash
npm run prisma:generate
# or
npx prisma generate
```

### 3. Setup Supabase Storage (for dispatch images)

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket named `dispatch-images`
4. Set appropriate access policies (public or authenticated)

### 4. Verify Installation

```bash
# Check if migration was applied
psql $DATABASE_URL -c "SELECT enum_range(NULL::\"PaymentTerm\");"

# Check if Contract table exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Contract\";"
```

---

## 📋 Feature Usage

### Contracts
```javascript
// Create contract
POST /api/admin/contracts
{
  "orgId": "...",
  "name": "Q1 Contract",
  "pricePMT": 8500,
  "startDate": "2025-01-01"
}
```

### Dispatch Tracking
```javascript
// Dispatch batch
POST /api/ops/dispatch
{
  "batchId": "...",
  "committedMT": 100,
  "suppliedMT": 98.5,
  "dispatchImageUrl": "https://..."
}
```

### Consumption Analytics
```javascript
// Get buyer consumption patterns
GET /api/buyer/consumption-patterns
```

### Dispatch Timeline
```javascript
// Get dispatch timeline
GET /api/ops/dispatch-timeline?batchId=...
```

---

## 🔧 Troubleshooting

### Migration Issues
- If shadow database error: Use `prisma migrate deploy` instead of `prisma migrate dev`
- If enum already exists: Migration is idempotent, safe to re-run

### Prisma Client Issues
- Always run `prisma generate` after schema changes
- Restart your Next.js dev server after generating client

### Image Upload Issues
- Verify Supabase bucket exists: `dispatch-images`
- Check Supabase credentials in `.env`
- Verify bucket access policies

---

## 📚 Documentation

- Full implementation details: `FEATURES_IMPLEMENTATION.md`
- Migration instructions: `MIGRATION_INSTRUCTIONS.md`
- API documentation: See individual endpoint files

