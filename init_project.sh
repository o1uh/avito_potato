#!/bin/bash

# Название корневой папки
ROOT_DIR="prodopt-backend"

echo "Создание структуры проекта $ROOT_DIR..."

# 1. Создание корневой директории
mkdir -p $ROOT_DIR
cd $ROOT_DIR

# 2. Создание корневых файлов
touch docker-compose.yml .env package.json package-lock.json tsconfig.json tsconfig.build.json nest-cli.json .eslintrc.js .prettierrc

# 3. Создание директорий и файлов: Prisma
mkdir -p prisma/migrations
touch prisma/schema.prisma prisma/seed.ts

# 4. Создание директорий и файлов: Templates
mkdir -p templates/documents
touch templates/documents/{invoice.hbs,contract.hbs,waybill.hbs,upd.hbs,act.hbs}

mkdir -p templates/emails
touch templates/emails/{welcome.hbs,auth-code.hbs,reset-password.hbs,notification.hbs}

# 5. Создание директорий и файлов: Test
mkdir -p test
touch test/{app.e2e-spec.ts,trade.e2e-spec.ts,jest-e2e.json}

# 6. Создание директорий и файлов: SRC (Root)
mkdir -p src
touch src/{main.ts,app.module.ts}

# 7. SRC: Config
mkdir -p src/config
touch src/config/{configuration.ts,validation.schema.ts}

# 8. SRC: Common
mkdir -p src/common/{decorators,guards,interceptors,filters,pipes,dto,utils,providers}
touch src/common/decorators/{current-user.decorator.ts,roles.decorator.ts,permissions.decorator.ts}
touch src/common/guards/{jwt-auth.guard.ts,roles.guard.ts,permissions.guard.ts}
touch src/common/interceptors/audit.interceptor.ts
touch src/common/filters/all-exceptions.filter.ts
touch src/common/pipes/validation.pipe.ts
touch src/common/dto/{pagination.dto.ts,date-range.dto.ts}
touch src/common/utils/distributed-lock.ts
touch src/common/providers/{storage.service.ts,email.service.ts,counterparty.service.ts}

# 9. SRC: Modules
# --- Health
mkdir -p src/modules/health
touch src/modules/health/health.controller.ts

# --- Auth
mkdir -p src/modules/auth/{strategies,controllers,services}
touch src/modules/auth/auth.module.ts
touch src/modules/auth/strategies/{jwt.strategy.ts,refresh.strategy.ts}
touch src/modules/auth/controllers/auth.controller.ts
touch src/modules/auth/services/{auth.service.ts,permissions.service.ts,sms.service.ts}

# --- References
mkdir -p src/modules/references
touch src/modules/references/{references.controller.ts,references.service.ts,references.module.ts}

# --- Users
mkdir -p src/modules/users/{adapters,controllers,services,dto}
touch src/modules/users/users.module.ts
touch src/modules/users/adapters/{geocoder.interface.ts,dadata-geocoder.ts}
touch src/modules/users/controllers/{users.controller.ts,companies.controller.ts,team.controller.ts}
touch src/modules/users/services/{users.service.ts,companies.service.ts,addresses.service.ts,banking.service.ts}

# --- Networking
mkdir -p src/modules/networking/dto
touch src/modules/networking/{partners.controller.ts,partners.service.ts,networking.module.ts}

# --- Catalog
mkdir -p src/modules/catalog/{consumers,controllers,services,dto}
touch src/modules/catalog/catalog.module.ts
touch src/modules/catalog/consumers/elastic-sync.consumer.ts
touch src/modules/catalog/controllers/{products.controller.ts,search.controller.ts}
touch src/modules/catalog/services/{products.service.ts,product-media.service.ts,variants.service.ts,categories.service.ts,search.service.ts}

# --- Trade
mkdir -p src/modules/trade/{adapters,utils,tasks,controllers,services,dto}
touch src/modules/trade/trade.module.ts
touch src/modules/trade/adapters/{delivery-provider.interface.ts,cdek.adapter.ts,dellin.adapter.ts,manual.adapter.ts}
touch src/modules/trade/utils/deal-state-machine.ts
touch src/modules/trade/tasks/{deal-autoclose.task.ts,tracking-poll.task.ts}
touch src/modules/trade/controllers/{rfq.controller.ts,offers.controller.ts,deals.controller.ts,shipment.controller.ts}
touch src/modules/trade/services/{rfq.service.ts,offers.service.ts,deals.service.ts,shipment.service.ts}

# --- Documents
mkdir -p src/modules/documents/{consumers,controllers,services,dto}
touch src/modules/documents/documents.module.ts
touch src/modules/documents/consumers/pdf-generation.consumer.ts
touch src/modules/documents/controllers/{documents.controller.ts,generation.controller.ts}
touch src/modules/documents/services/{documents.service.ts,pdf-generator.service.ts,verification.service.ts}

# --- Finance
mkdir -p src/modules/finance/{adapters,guards,tasks,controllers,services,dto}
touch src/modules/finance/finance.module.ts
touch src/modules/finance/adapters/{payment-gateway.interface.ts,tochka-bank.adapter.ts}
touch src/modules/finance/guards/bank-webhook.guard.ts
touch src/modules/finance/tasks/payout-retry.task.ts
touch src/modules/finance/controllers/finance.controller.ts
touch src/modules/finance/services/{escrow.service.ts,transactions.service.ts,commission.service.ts}

# --- Communication
mkdir -p src/modules/communication/{gateways,controllers,services,dto}
touch src/modules/communication/communication.module.ts
touch src/modules/communication/gateways/chat.gateway.ts
touch src/modules/communication/controllers/{chat.controller.ts,notifications.controller.ts}
touch src/modules/communication/services/{chat.service.ts,notifications.service.ts}

# --- Governance
mkdir -p src/modules/governance/{controllers,services,dto}
touch src/modules/governance/governance.module.ts
touch src/modules/governance/controllers/{disputes.controller.ts,reviews.controller.ts}
touch src/modules/governance/services/{disputes.service.ts,company-reviews.service.ts,product-reviews.service.ts}

# --- Support
mkdir -p src/modules/support/{controllers,services,dto}
touch src/modules/support/support.module.ts
touch src/modules/support/controllers/tickets.controller.ts
touch src/modules/support/services/tickets.service.ts

# --- Analytics
mkdir -p src/modules/analytics/{tasks,controllers,services,dto}
touch src/modules/analytics/analytics.module.ts
touch src/modules/analytics/tasks/stats-aggregation.task.ts
touch src/modules/analytics/controllers/analytics.controller.ts
touch src/modules/analytics/services/export.service.ts

# --- Admin
mkdir -p src/modules/admin/{controllers,services,dto}
touch src/modules/admin/admin.module.ts
touch src/modules/admin/controllers/{admin.controller.ts,users-management.controller.ts,references-management.controller.ts}
touch src/modules/admin/services/{moderation.service.ts,employees.service.ts,settings.service.ts,audit-logs.service.ts}

echo "Структура проекта успешно создана в папке $ROOT_DIR"