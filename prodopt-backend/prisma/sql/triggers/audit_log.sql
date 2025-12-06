CREATE OR REPLACE FUNCTION log_status_change() RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
        INSERT INTO status_history (
            entity_type, 
            entity_id, 
            old_status_id, 
            new_status_id, 
            changed_at, 
            initiator_user_id
        )
        VALUES (
            TG_ARGV[0], -- Передается как аргумент триггера ('DEAL', 'PRODUCT')
            NEW.id,
            OLD.status_id,
            NEW.status_id,
            NOW(),
            NULL -- TODO: Передавать ID пользователя через session variables
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;