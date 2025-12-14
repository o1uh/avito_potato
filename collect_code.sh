#!/bin/bash

OUTPUT_FILE="project_context.txt"

# Очищаем старый файл
> "$OUTPUT_FILE"

echo "Начинаю сборку кода в файл '$OUTPUT_FILE'..."

# Используем find для поиска всех файлов, а затем пайплайн для фильтрации
find . -type f | \
    # Исключаем пути, содержащие указанные папки
    grep -v '/\.git/' | \
    grep -v '/node_modules/' | \
    grep -v '/dist/' | \
    grep -v '/\.vscode/' | \
    # Исключаем конкретные файлы по имени
    grep -v 'package-lock.json' | \
    grep -v 'yarn.lock' | \
    grep -v '\.env' | \
    grep -v 'README.md' | \
    grep -v 'init_project.sh' | \
    grep -v 'collect_code.sh' | \
    grep -v "$OUTPUT_FILE" | \
    # Исключаем файлы по расширению
    grep -v '\.log$' | \
    grep -v '\.ico$' | \
    grep -v '\.png$' | \
    grep -v '\.jpg$' | \
    grep -v '\.jpeg$' | \
    grep -v '\.gif$' | \
    grep -v '\.svg$' | \
    grep -v '\.pdf$' | \
    while IFS= read -r file; do
    
    relative_path=$(echo "$file" | sed 's|^\./||')

    echo "--- START OF FILE $relative_path ---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "Готово! Весь код проекта собран в '$OUTPUT_FILE'."