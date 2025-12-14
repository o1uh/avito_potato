-- CreateTable
CREATE TABLE "shipments" (
    "id" SERIAL NOT NULL,
    "tracking_number" VARCHAR(100) NOT NULL,
    "logistics_service" VARCHAR(100),
    "sent_at" TIMESTAMP(3),
    "expected_delivery_date" DATE,
    "deal_id" INTEGER NOT NULL,
    "delivery_status_id" INTEGER NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "delivery_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_statuses_name_key" ON "delivery_statuses"("name");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_delivery_status_id_fkey" FOREIGN KEY ("delivery_status_id") REFERENCES "delivery_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
