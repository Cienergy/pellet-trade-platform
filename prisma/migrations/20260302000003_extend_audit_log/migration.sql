-- Extend AuditLog with metadata + request correlation (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='AuditLog' AND column_name='metadata') THEN
    ALTER TABLE "AuditLog" ADD COLUMN "metadata" JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='AuditLog' AND column_name='requestId') THEN
    ALTER TABLE "AuditLog" ADD COLUMN "requestId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='AuditLog' AND column_name='ip') THEN
    ALTER TABLE "AuditLog" ADD COLUMN "ip" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='AuditLog' AND column_name='userAgent') THEN
    ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;
  END IF;
END $$;

