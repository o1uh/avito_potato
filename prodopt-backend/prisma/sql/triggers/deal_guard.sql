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