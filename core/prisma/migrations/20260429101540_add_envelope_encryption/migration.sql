-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "dek_encrypted" BYTEA;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "last_sync_error" TEXT,
ADD COLUMN     "last_synced_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "services_org_id_last_synced_at_idx" ON "services"("org_id", "last_synced_at");
