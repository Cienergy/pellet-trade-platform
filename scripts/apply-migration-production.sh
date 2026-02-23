#!/bin/bash
# Production migration script for contracts, dispatch, and GST features
# This script applies the migration directly to the database

set -e

echo "🚀 Applying production migration: add_contracts_dispatch_gst_features"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract database connection details
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📋 Migration file: prisma/migrations/20250120000000_add_contracts_dispatch_gst_features/migration.sql"
echo "🗄️  Database: $DB_NAME"

# Apply migration using psql if available, otherwise provide instructions
if command -v psql &> /dev/null; then
    echo "✅ Applying migration..."
    psql "$DATABASE_URL" -f prisma/migrations/20250120000000_add_contracts_dispatch_gst_features/migration.sql
    echo "✅ Migration applied successfully!"
    
    # Mark migration as applied
    echo "📝 Marking migration as applied in Prisma..."
    npx prisma migrate resolve --applied 20250120000000_add_contracts_dispatch_gst_features || echo "⚠️  Could not mark as applied automatically. Run manually: npx prisma migrate resolve --applied 20250120000000_add_contracts_dispatch_gst_features"
else
    echo "⚠️  psql not found. Please apply the migration manually:"
    echo ""
    echo "   psql \$DATABASE_URL -f prisma/migrations/20250120000000_add_contracts_dispatch_gst_features/migration.sql"
    echo ""
    echo "   Then mark it as applied:"
    echo "   npx prisma migrate resolve --applied 20250120000000_add_contracts_dispatch_gst_features"
    exit 1
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "✅ Migration complete! All features are now available."

