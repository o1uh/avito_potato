/*
  Warnings:

  - A unique constraint covering the columns `[commercial_offer_id]` on the table `deals` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "commercial_offer_id" INTEGER,
ADD COLUMN     "delivery_terms" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "request_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "request_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_offers" (
    "id" SERIAL NOT NULL,
    "purchase_request_id" INTEGER NOT NULL,
    "supplier_company_id" INTEGER NOT NULL,
    "offer_price" DECIMAL(12,2) NOT NULL,
    "delivery_conditions" TEXT,
    "expires_on" DATE NOT NULL,
    "offer_status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "offer_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperation_requests" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "initiator_company_id" INTEGER NOT NULL,
    "recipient_company_id" INTEGER NOT NULL,
    "request_status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooperation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperation_request_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "cooperation_request_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_items" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_per_unit" DECIMAL(10,2),
    "product_name_at_deal_moment" VARCHAR(255),
    "variant_name_at_deal_moment" VARCHAR(255),
    "measurement_unit_at_deal_moment" VARCHAR(20),

    CONSTRAINT "deal_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_statuses_name_key" ON "request_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "offer_statuses_name_key" ON "offer_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cooperation_request_statuses_name_key" ON "cooperation_request_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "deals_commercial_offer_id_key" ON "deals"("commercial_offer_id");

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_request_status_id_fkey" FOREIGN KEY ("request_status_id") REFERENCES "request_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_offers" ADD CONSTRAINT "commercial_offers_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_offers" ADD CONSTRAINT "commercial_offers_supplier_company_id_fkey" FOREIGN KEY ("supplier_company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_offers" ADD CONSTRAINT "commercial_offers_offer_status_id_fkey" FOREIGN KEY ("offer_status_id") REFERENCES "offer_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperation_requests" ADD CONSTRAINT "cooperation_requests_initiator_company_id_fkey" FOREIGN KEY ("initiator_company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperation_requests" ADD CONSTRAINT "cooperation_requests_recipient_company_id_fkey" FOREIGN KEY ("recipient_company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperation_requests" ADD CONSTRAINT "cooperation_requests_request_status_id_fkey" FOREIGN KEY ("request_status_id") REFERENCES "cooperation_request_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_company_id_fkey" FOREIGN KEY ("buyer_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_supplier_company_id_fkey" FOREIGN KEY ("supplier_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_commercial_offer_id_fkey" FOREIGN KEY ("commercial_offer_id") REFERENCES "commercial_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
