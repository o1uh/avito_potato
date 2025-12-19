#!/bin/bash

OUTPUT_FILE="project_context.txt"

# Очищаем старый файл
> "$OUTPUT_FILE"

echo "Начинаю сборку кода всего проекта (Backend + Frontend) в файл '$OUTPUT_FILE'..."

# Используем find для поиска всех файлов
find . -type f | \
    # 1. Исключаем системные и служебные директории
    grep -v '/\.git/' | \
    grep -v '/node_modules/' | \
    grep -v '/dist/' | \
    grep -v '/build/' | \
    grep -v '/coverage/' | \
    grep -v '/\.vscode/' | \
    grep -v '/\.idea/' | \
    # 2. Исключаем файлы блокировок и служебные файлы пакетов (если не нужны для контекста)
    grep -v 'package-lock.json' | \
    grep -v 'yarn.lock' | \
    grep -v 'pnpm-lock.yaml' | \
    # 3. Исключаем локальные env и документацию
    grep -v '\.env' | \
    grep -v 'README.md' | \
    # 4. Исключаем сами скрипты
    grep -v 'init_project.sh' | \
    grep -v 'init_frontend.sh' | \
    grep -v 'collect_code.sh' | \
    grep -v "$OUTPUT_FILE" | \
    # 5. Исключаем бинарные файлы, изображения и шрифты (важно для фронтенда)
    grep -v '\.log$' | \
    grep -v '\.ico$' | \
    grep -v '\.png$' | \
    grep -v '\.jpg$' | \
    grep -v '\.jpeg$' | \
    grep -v '\.gif$' | \
    grep -v '\.svg$' | \
    grep -v '\.webp$' | \
    grep -v '\.pdf$' | \
    grep -v '\.woff$' | \
    grep -v '\.woff2$' | \
    grep -v '\.ttf$' | \
    grep -v '\.eot$' | \
    grep -v '\.DS_Store' | \
    while IFS= read -r file; do
    
    # Убираем ./ в начале пути для красоты
    relative_path=$(echo "$file" | sed 's|^\./||')

    echo "--- START OF FILE $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "Готово! Весь код проекта собран в '$OUTPUT_FILE'."