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

DROP TRIGGER IF EXISTS freeze_price ON deal_items; 

-- ИСПОЛЬЗУЕМ deal_items (в нижнем регистре, без кавычек или в кавычках но с маленькой буквы)
-- Так как в Prisma @@map("deal_items")
CREATE TRIGGER freeze_price
BEFORE INSERT ON deal_items 
FOR EACH ROW
EXECUTE FUNCTION freeze_deal_item_price();