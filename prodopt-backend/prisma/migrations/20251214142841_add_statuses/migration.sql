-- CreateTable
CREATE TABLE "deal_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "deal_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_account_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "escrow_account_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "transaction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "transaction_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deal_statuses_name_key" ON "deal_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_account_statuses_name_key" ON "escrow_account_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_types_name_key" ON "transaction_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_statuses_name_key" ON "transaction_statuses"("name");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_deal_status_id_fkey" FOREIGN KEY ("deal_status_id") REFERENCES "deal_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_accounts" ADD CONSTRAINT "escrow_accounts_escrow_status_id_fkey" FOREIGN KEY ("escrow_status_id") REFERENCES "escrow_account_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transaction_type_id_fkey" FOREIGN KEY ("transaction_type_id") REFERENCES "transaction_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transaction_status_id_fkey" FOREIGN KEY ("transaction_status_id") REFERENCES "transaction_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
