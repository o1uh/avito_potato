-- CreateTable
CREATE TABLE "payment_details" (
    "id" SERIAL NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "bik" VARCHAR(9) NOT NULL,
    "checking_account" VARCHAR(20) NOT NULL,
    "correspondent_account" VARCHAR(20) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "payment_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_details_company_id_idx" ON "payment_details"("company_id");

-- AddForeignKey
ALTER TABLE "payment_details" ADD CONSTRAINT "payment_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
