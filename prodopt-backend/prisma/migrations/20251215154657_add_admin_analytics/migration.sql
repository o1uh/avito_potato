-- AlterTable
ALTER TABLE "products" ADD COLUMN     "moderator_id" INTEGER;

-- CreateTable
CREATE TABLE "disputes" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER NOT NULL,
    "dispute_reason" TEXT NOT NULL,
    "claimant_demands" TEXT NOT NULL,
    "final_decision" TEXT,
    "refund_amount" DECIMAL(12,2),
    "claimant_company_id" INTEGER NOT NULL,
    "defendant_company_id" INTEGER NOT NULL,
    "arbiter_id" INTEGER,
    "dispute_status_id" INTEGER NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "dispute_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_reviews" (
    "id" SERIAL NOT NULL,
    "service_rating" INTEGER NOT NULL,
    "service_comment" TEXT,
    "review_response" TEXT,
    "deal_id" INTEGER NOT NULL,
    "review_status_id" INTEGER NOT NULL,
    "author_company_id" INTEGER NOT NULL,
    "recipient_company_id" INTEGER NOT NULL,
    "moderator_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_statuses" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "review_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_statistics" (
    "company_id" INTEGER NOT NULL,
    "total_deals_as_supplier" INTEGER NOT NULL DEFAULT 0,
    "total_sales_volume" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "average_sales_check" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deals_as_buyer" INTEGER NOT NULL DEFAULT 0,
    "total_purchases_volume" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_statistics_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" SERIAL NOT NULL,
    "product_rating" INTEGER NOT NULL,
    "product_comment" TEXT NOT NULL,
    "deal_item_id" INTEGER NOT NULL,
    "review_status_id" INTEGER NOT NULL,
    "author_user_id" INTEGER NOT NULL,
    "moderator_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispute_statuses_name_key" ON "dispute_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "review_statuses_name_key" ON "review_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_deal_item_id_key" ON "product_reviews"("deal_item_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_dispute_status_id_fkey" FOREIGN KEY ("dispute_status_id") REFERENCES "dispute_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_claimant_company_id_fkey" FOREIGN KEY ("claimant_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_defendant_company_id_fkey" FOREIGN KEY ("defendant_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_review_status_id_fkey" FOREIGN KEY ("review_status_id") REFERENCES "review_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_author_company_id_fkey" FOREIGN KEY ("author_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_reviews" ADD CONSTRAINT "company_reviews_recipient_company_id_fkey" FOREIGN KEY ("recipient_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_statistics" ADD CONSTRAINT "company_statistics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_deal_item_id_fkey" FOREIGN KEY ("deal_item_id") REFERENCES "deal_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_review_status_id_fkey" FOREIGN KEY ("review_status_id") REFERENCES "review_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ... (тут код создания таблиц от Prisma) ...

-- --- ВСТАВИТЬ В КОНЕЦ ФАЙЛА ---

-- 1. Функция расчета рейтинга компании
CREATE OR REPLACE FUNCTION calculate_company_rating(p_company_id INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE "companies"
    SET rating = (
        SELECT COALESCE(AVG(service_rating), 0)
        FROM "company_reviews"
        WHERE recipient_company_id = p_company_id
        AND review_status_id = 2 -- 2 = Published
    )
    WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Триггерная функция для вызова пересчета
CREATE OR REPLACE FUNCTION trigger_recalc_rating() RETURNS TRIGGER AS $$
BEGIN
    -- Пересчитываем рейтинг для того, кому оставили отзыв
    PERFORM calculate_company_rating(NEW.recipient_company_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Создание триггера на company_reviews
DROP TRIGGER IF EXISTS rating_recalc ON "company_reviews";
CREATE TRIGGER rating_recalc
AFTER INSERT OR UPDATE ON "company_reviews"
FOR EACH ROW
EXECUTE FUNCTION trigger_recalc_rating();

-- 4. Функция обновления статистики (Аналитика)
CREATE OR REPLACE FUNCTION update_company_stats() RETURNS TRIGGER AS $$
BEGIN
    -- Срабатывает только при переходе в статус COMPLETED (ID 5)
    IF NEW.deal_status_id = 5 AND (OLD.deal_status_id IS NULL OR OLD.deal_status_id != 5) THEN
        
        -- А. Обновляем статистику Поставщика
        INSERT INTO "company_statistics" ("company_id", "total_deals_as_supplier", "total_sales_volume", "last_updated_at")
        VALUES (NEW.supplier_company_id, 1, NEW.total_amount, NOW())
        ON CONFLICT ("company_id") DO UPDATE SET
            "total_deals_as_supplier" = "company_statistics"."total_deals_as_supplier" + 1,
            "total_sales_volume" = "company_statistics"."total_sales_volume" + EXCLUDED."total_sales_volume",
            "last_updated_at" = NOW();

        -- Б. Обновляем статистику Покупателя
        INSERT INTO "company_statistics" ("company_id", "total_deals_as_buyer", "total_purchases_volume", "last_updated_at")
        VALUES (NEW.buyer_company_id, 1, NEW.total_amount, NOW())
        ON CONFLICT ("company_id") DO UPDATE SET
            "total_deals_as_buyer" = "company_statistics"."total_deals_as_buyer" + 1,
            "total_purchases_volume" = "company_statistics"."total_purchases_volume" + EXCLUDED."total_purchases_volume",
            "last_updated_at" = NOW();
            
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Создание триггера на deals
DROP TRIGGER IF EXISTS stats_update_trigger ON "deals";
CREATE TRIGGER stats_update_trigger
AFTER UPDATE ON "deals"
FOR EACH ROW
EXECUTE FUNCTION update_company_stats();