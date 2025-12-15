CREATE OR REPLACE FUNCTION update_company_stats() RETURNS TRIGGER AS $$
BEGIN
    -- Срабатывает только при переходе в статус COMPLETED (ID 5)
    IF NEW.deal_status_id = 5 AND OLD.deal_status_id != 5 THEN
        
        -- 1. Обновляем статистику Поставщика
        INSERT INTO company_statistics (company_id, total_deals_as_supplier, total_sales_volume, last_updated_at)
        VALUES (NEW.supplier_company_id, 1, NEW.total_amount, NOW())
        ON CONFLICT (company_id) DO UPDATE SET
            total_deals_as_supplier = company_statistics.total_deals_as_supplier + 1,
            total_sales_volume = company_statistics.total_sales_volume + EXCLUDED.total_sales_volume,
            last_updated_at = NOW();

        -- 2. Обновляем статистику Покупателя
        INSERT INTO company_statistics (company_id, total_deals_as_buyer, total_purchases_volume, last_updated_at)
        VALUES (NEW.buyer_company_id, 1, NEW.total_amount, NOW())
        ON CONFLICT (company_id) DO UPDATE SET
            total_deals_as_buyer = company_statistics.total_deals_as_buyer + 1,
            total_purchases_volume = company_statistics.total_purchases_volume + EXCLUDED.total_purchases_volume,
            last_updated_at = NOW();
            
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stats_update_trigger ON deals;
CREATE TRIGGER stats_update_trigger
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION update_company_stats();