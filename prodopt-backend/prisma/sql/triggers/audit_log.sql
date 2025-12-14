CREATE OR REPLACE FUNCTION log_status_change() RETURNS TRIGGER AS $$
DECLARE
    v_old_status INT;
    v_new_status INT;
BEGIN
    IF TG_ARGV[0] = 'DEAL' THEN
        v_old_status := OLD.deal_status_id;
        v_new_status := NEW.deal_status_id;
    ELSIF TG_ARGV[0] = 'PRODUCT' THEN
        v_old_status := OLD.product_status_id;
        v_new_status := NEW.product_status_id;
    ELSIF TG_ARGV[0] = 'DOCUMENT' THEN
        v_old_status := OLD.document_status_id;
        v_new_status := NEW.document_status_id;
    ELSE
        RETURN NEW;
    END IF;

    -- Если статус изменился, пишем лог
    IF (v_old_status IS DISTINCT FROM v_new_status) THEN
        INSERT INTO status_history (
            entity_type, 
            entity_id, 
            old_status_id, 
            new_status_id, 
            changed_at, 
            initiator_user_id
        )
        VALUES (
            TG_ARGV[0],     
            NEW.id,
            v_old_status,
            v_new_status,
            NOW(),
            NULL -- TODO: В будущем ID пользователя через session variables
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;