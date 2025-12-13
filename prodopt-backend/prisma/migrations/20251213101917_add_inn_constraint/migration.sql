-- Добавляем ограничение на таблицу companies
-- Это будет работать только если функция validate_inn уже создана (она у нас есть в файлах инициализации)

ALTER TABLE "companies" 
ADD CONSTRAINT "check_inn_valid" 
CHECK (validate_inn("inn"));