CREATE OR REPLACE FUNCTION calculate_company_rating(p_company_id INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE companies
    SET rating = (
        SELECT COALESCE(AVG(service_rating), 0)
        FROM company_reviews
        WHERE recipient_company_id = p_company_id
        AND review_status_id = 2 -- Опубликован
    )
    WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql;