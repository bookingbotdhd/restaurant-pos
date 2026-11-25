-- CreateEnum
CREATE TYPE "WhatsAppBillSendStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_bill_sends" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sentById" TEXT,
    "provider" TEXT NOT NULL,
    "templateName" TEXT,
    "toMasked" TEXT NOT NULL,
    "status" "WhatsAppBillSendStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_bill_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_bill_sends_providerMessageId_key" ON "whatsapp_bill_sends"("providerMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_bill_sends_orderId_createdAt_idx" ON "whatsapp_bill_sends"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "whatsapp_bill_sends" ADD CONSTRAINT "whatsapp_bill_sends_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_bill_sends" ADD CONSTRAINT "whatsapp_bill_sends_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
