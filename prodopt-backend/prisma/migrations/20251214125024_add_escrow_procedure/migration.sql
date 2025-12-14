CREATE OR REPLACE PROCEDURE process_escrow(
    p_deal_id INTEGER,
    p_amount DECIMAL(12, 2),
    p_operation_type VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_escrow_account RECORD;
    v_transaction_type_id INT;
BEGIN
    -- 1. Блокировка строки (таблица escrow_accounts в нижнем регистре)
    SELECT * INTO v_escrow_account 
    FROM escrow_accounts 
    WHERE deal_id = p_deal_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Escrow account for deal % not found', p_deal_id;
    END IF;

    -- 2. Логика операций
    CASE p_operation_type
        WHEN 'DEPOSIT' THEN
            UPDATE escrow_accounts
            SET amount_deposited = amount_deposited + p_amount,
                updated_at = NOW(),
                escrow_status_id = CASE 
                    WHEN (amount_deposited + p_amount) >= total_amount THEN 2 
                    ELSE 1 
                END
            WHERE deal_id = p_deal_id;
            v_transaction_type_id := 1; 

        WHEN 'RELEASE' THEN
            IF v_escrow_account.amount_deposited < p_amount THEN
                RAISE EXCEPTION 'Insufficient funds: deposited %, required %', v_escrow_account.amount_deposited, p_amount;
            END IF;

            UPDATE escrow_accounts
            SET amount_deposited = amount_deposited - p_amount,
                escrow_status_id = 3, 
                updated_at = NOW()
            WHERE deal_id = p_deal_id;
            v_transaction_type_id := 2;

        WHEN 'REFUND' THEN
            IF v_escrow_account.amount_deposited < p_amount THEN
                RAISE EXCEPTION 'Insufficient funds for refund';
            END IF;

            UPDATE escrow_accounts
            SET amount_deposited = amount_deposited - p_amount,
                escrow_status_id = 4, 
                updated_at = NOW()
            WHERE deal_id = p_deal_id;
            v_transaction_type_id := 3;

        ELSE
            RAISE EXCEPTION 'Unknown operation type: %', p_operation_type;
    END CASE;

    -- 3. Запись в лог (таблица transactions)
    INSERT INTO transactions (
        amount, 
        deal_id, 
        transaction_type_id, 
        transaction_status_id, 
        created_at
    ) VALUES (
        p_amount,
        p_deal_id,
        v_transaction_type_id,
        2, 
        NOW()
    );

    COMMIT;
END;
$$;