-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "inn" VARCHAR(12) NOT NULL,
    "kpp" VARCHAR(9),
    "ogrn" VARCHAR(15) NOT NULL,
    "description" TEXT,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "organization_type_id" INTEGER NOT NULL,
    "verification_status_id" INTEGER,
    "responsible_employee_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "position" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" INTEGER NOT NULL,
    "role_in_company_id" INTEGER NOT NULL,
    "refresh_token_hash" TEXT,
    "refresh_token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "supplier_company_id" INTEGER NOT NULL,
    "product_category_id" INTEGER NOT NULL,
    "product_status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sku" VARCHAR(100),
    "variant_name" VARCHAR(255),
    "price" DECIMAL(10,2) NOT NULL,
    "min_order_quantity" INTEGER NOT NULL DEFAULT 1,
    "stock_quantity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" SERIAL NOT NULL,
    "comment" TEXT,
    "request_status_id" INTEGER NOT NULL,
    "buyer_company_id" INTEGER NOT NULL,
    "supplier_company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_inn_key" ON "companies"("inn");

-- CreateIndex
CREATE INDEX "companies_inn_idx" ON "companies"("inn");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_refresh_token_hash_key" ON "users"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_company_id_fkey" FOREIGN KEY ("supplier_company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_buyer_company_id_fkey" FOREIGN KEY ("buyer_company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_supplier_company_id_fkey" FOREIGN KEY ("supplier_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- From: prisma/sql/functions/validate_inn.sql
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

-- From: prisma/sql/triggers/audit_log.sql
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