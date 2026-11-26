-- Licence / activation (RestroOS hosted product): one row per host-issued
-- licence key. Only the SHA-256 hash is stored; the raw key is shown once
-- at issue time. Activation is bookkeeping only — nothing stops working
-- without a licence, and this does NOT change the app's licence (RestroOS
-- stays AGPL-3.0, see LICENSE). The backend already queries prisma.licence
-- (licence.service.ts), so without this migration those calls fail.
-- Apply with `prisma migrate deploy` on the DB machine, after
-- 20261126000000_hold_order. No data change: the table starts empty.

-- CreateEnum
CREATE TYPE "LicenceStatus" AS ENUM ('ISSUED', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "licences" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'STANDARD',
    "issuedTo" TEXT,
    "note" TEXT,
    "status" "LicenceStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "restaurantId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "instanceId" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "licences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "licences_keyHash_key" ON "licences"("keyHash");

-- CreateIndex
CREATE INDEX "licences_restaurantId_idx" ON "licences"("restaurantId");

-- CreateIndex
CREATE INDEX "licences_status_idx" ON "licences"("status");

-- AddForeignKey
ALTER TABLE "licences" ADD CONSTRAINT "licences_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
