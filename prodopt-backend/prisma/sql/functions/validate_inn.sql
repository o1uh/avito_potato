CREATE OR REPLACE FUNCTION validate_inn(inn text) RETURNS boolean AS $$
DECLARE
    digits integer[];
    weights_10 integer[] := ARRAY[2,4,10,3,5,9,4,6,8];
    weights_11 integer[] := ARRAY[7,2,4,10,3,5,9,4,6,8];
    weights_12 integer[] := ARRAY[3,7,2,4,10,3,5,9,4,6,8];
    sum integer;
    checksum integer;
    i integer;
BEGIN
    -- Проверка на длину и цифры
    IF inn !~ '^[0-9]+$' THEN RETURN FALSE; END IF;
    
    SELECT array_agg(x::integer) INTO digits FROM regexp_split_to_table(inn, '') as x;

    -- Юр. лица (10 цифр)
    IF length(inn) = 10 THEN
        sum := 0;
        FOR i IN 1..9 LOOP
            sum := sum + digits[i] * weights_10[i];
        END LOOP;
        checksum := (sum % 11) % 10;
        RETURN checksum = digits[10];
    
    -- ИП (12 цифр)
    ELSIF length(inn) = 12 THEN
        -- 11-я цифра
        sum := 0;
        FOR i IN 1..10 LOOP
            sum := sum + digits[i] * weights_11[i];
        END LOOP;
        IF (sum % 11) % 10 != digits[11] THEN RETURN FALSE; END IF;

        -- 12-я цифра
        sum := 0;
        FOR i IN 1..11 LOOP
            sum := sum + digits[i] * weights_12[i];
        END LOOP;
        RETURN (sum % 11) % 10 = digits[12];
    
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;