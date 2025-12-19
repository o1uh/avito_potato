-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "product_variant_id" INTEGER,
ADD COLUMN     "requested_quantity" INTEGER;

-- CreateTable
CREATE TABLE "offer_items" (
    "id" SERIAL NOT NULL,
    "commercial_offer_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_per_unit" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "offer_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_commercial_offer_id_fkey" FOREIGN KEY ("commercial_offer_id") REFERENCES "commercial_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION freeze_deal_item_price() RETURNS TRIGGER AS $$
DECLARE
    current_price DECIMAL(10, 2);
    variant_name TEXT;
    prod_name TEXT;
    unit_name TEXT;
BEGIN
    -- Подтягиваем данные варианта
    SELECT pv.price, pv.variant_name, p.name, mu.name
    INTO current_price, variant_name, prod_name, unit_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    JOIN measurement_units mu ON mu.id = pv.measurement_unit_id
    WHERE pv.id = NEW.product_variant_id;

    -- Если цена не передана, берем из каталога
    IF NEW.price_per_unit IS NULL THEN
        NEW.price_per_unit := current_price;
    END IF;
    
    -- Имена фиксируем ВСЕГДА, если они не переданы явно, 
    -- независимо от того, передана цена или нет.
    IF NEW.product_name_at_deal_moment IS NULL THEN
        NEW.product_name_at_deal_moment := prod_name;
        NEW.variant_name_at_deal_moment := variant_name;
        NEW.measurement_unit_at_deal_moment := unit_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
