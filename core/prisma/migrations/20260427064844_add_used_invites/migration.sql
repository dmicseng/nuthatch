-- CreateTable
CREATE TABLE "used_invites" (
    "jti_hash" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accepted_by_user_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "used_invites_pkey" PRIMARY KEY ("jti_hash")
);

-- CreateIndex
CREATE INDEX "used_invites_org_id_idx" ON "used_invites"("org_id");

-- CreateIndex
CREATE INDEX "used_invites_accepted_by_user_id_idx" ON "used_invites"("accepted_by_user_id");

-- AddForeignKey
ALTER TABLE "used_invites" ADD CONSTRAINT "used_invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "used_invites" ADD CONSTRAINT "used_invites_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
