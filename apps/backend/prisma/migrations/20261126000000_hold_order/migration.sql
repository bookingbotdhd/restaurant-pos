-- Hold order (RestroOS checkout feature): park an order as ON_HOLD and
-- resume it later. The backend already sets status 'ON_HOLD' with heldAt /
-- heldById (orders.service.ts hold/resume), so without this migration those
-- calls fail. Apply with `prisma migrate deploy` on the DB machine, after
-- 20261125170000_whatsapp_bill_sends. No data change: existing orders are
-- untouched (both new columns are nullable).
--
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Prisma's migration engine runs it outside the transaction; if your
-- Prisma version complains, run that one line first via psql, then deploy.

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'ON_HOLD';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "heldAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "heldById" TEXT;
