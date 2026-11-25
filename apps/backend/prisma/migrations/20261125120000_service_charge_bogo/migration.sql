-- Service charge + BOGO bill lines (RestroOS checkout features).
-- Split payment needs no schema change: Payment is already one row per
-- payment against an order, so several payments per bill already fit.
-- Apply with `prisma migrate deploy` (or `prisma db push` in dev); all
-- columns carry defaults, so existing restaurants and orders are untouched.

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "serviceChargePercent" DECIMAL(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "restaurants" ADD COLUMN "bogoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN "bogoBuyQty" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "restaurants" ADD COLUMN "bogoGetQty" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "serviceChargePercent" DECIMAL(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "serviceChargeAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "bogoDiscountAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;
