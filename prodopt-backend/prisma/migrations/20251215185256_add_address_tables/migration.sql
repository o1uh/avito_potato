-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "delivery_address_id" INTEGER;

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100) NOT NULL,
    "region" VARCHAR(150),
    "city" VARCHAR(150),
    "street" VARCHAR(255),
    "house" VARCHAR(50),
    "building" VARCHAR(50),
    "apartment" VARCHAR(50),
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "address_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_addresses" (
    "company_id" INTEGER NOT NULL,
    "address_id" INTEGER NOT NULL,
    "address_type_id" INTEGER NOT NULL,

    CONSTRAINT "company_addresses_pkey" PRIMARY KEY ("company_id","address_id","address_type_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "address_types_name_key" ON "address_types"("name");

-- AddForeignKey
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_address_type_id_fkey" FOREIGN KEY ("address_type_id") REFERENCES "address_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
