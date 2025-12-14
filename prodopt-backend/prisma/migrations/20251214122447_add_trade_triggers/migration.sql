CREATE OR REPLACE FUNCTION check_deal_update() RETURNS TRIGGER AS $$
BEGIN
    -- 1. Запрет изменения финансовых условий, если сделка уже согласована (AGREED = 2 и выше)
    IF OLD.deal_status_id >= 2 THEN
        IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
            RAISE EXCEPTION 'Cannot change deal amount after agreement';
        END IF;
    END IF;

    -- 2. Валидация переходов статусов (Упрощенная логика на уровне БД, детальная в коде)
    -- Нельзя перепрыгнуть из CREATED (1) сразу в PAID (3) или COMPLETED (5)
    -- Разрешено: 1->2 (Agreed), 2->3 (Paid), 3->4 (Shipped), 4->5 (Completed)
    -- Также разрешена отмена (Status 6, 7) из любого статуса
    IF NEW.deal_status_id NOT IN (6, 7) AND NEW.deal_status_id > OLD.deal_status_id + 1 THEN
         RAISE EXCEPTION 'Invalid status transition from % to %', OLD.deal_status_id, NEW.deal_status_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deal_guard ON deals;
CREATE TRIGGER deal_guard
BEFORE UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION check_deal_update();

CREATE OR REPLACE FUNCTION freeze_deal_item_price() RETURNS TRIGGER AS $$
DECLARE
    current_price DECIMAL(10, 2);
    variant_name TEXT;
    prod_name TEXT;
    unit_name TEXT;
BEGIN
    -- Если цена или названия не переданы, подтягиваем их из ProductVariant
    IF NEW.price_per_unit IS NULL OR NEW.product_name_at_deal_moment IS NULL THEN
        SELECT 
            pv.price, 
            pv.variant_name,
            p.name,
            mu.name
        INTO 
            current_price,
            variant_name,
            prod_name,
            unit_name
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        JOIN measurement_units mu ON mu.id = pv.measurement_unit_id
        WHERE pv.id = NEW.product_variant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product variant % not found', NEW.product_variant_id;
        END IF;

        IF NEW.price_per_unit IS NULL THEN
            NEW.price_per_unit := current_price;
        END IF;
        
        -- Фиксируем названия на момент сделки (snapshot)
        IF NEW.product_name_at_deal_moment IS NULL THEN
            NEW.product_name_at_deal_moment := prod_name;
            NEW.variant_name_at_deal_moment := variant_name;
            NEW.measurement_unit_at_deal_moment := unit_name;
        END IF;
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