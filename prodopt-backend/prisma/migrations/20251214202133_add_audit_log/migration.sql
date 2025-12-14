-- CreateTable
CREATE TABLE "status_history" (
    "id" SERIAL NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "old_status_id" INTEGER,
    "new_status_id" INTEGER NOT NULL,
    "initiator_user_id" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "status_history_entity_type_entity_id_idx" ON "status_history"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_initiator_user_id_fkey" FOREIGN KEY ("initiator_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

DROP TRIGGER IF EXISTS audit_deals ON deals;
CREATE TRIGGER audit_deals
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION log_status_change('DEAL');

DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION log_status_change('PRODUCT');

DROP TRIGGER IF EXISTS audit_documents ON documents;
CREATE TRIGGER audit_documents
AFTER UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION log_status_change('DOCUMENT');