#!/bin/bash

# Название корневой папки фронтенда
FRONT_DIR="prodopt-frontend"

echo "Создание структуры проекта $FRONT_DIR..."

# 1. Создание корня
mkdir -p $FRONT_DIR
cd $FRONT_DIR

# 2. Корневые конфигурационные файлы
touch .env .eslintrc.cjs .gitignore index.html package.json tsconfig.json vite.config.ts

# 3. Базовая структура src
mkdir -p src/{app,pages,widgets,features,entities,shared}

# ==========================
# LAYER 1: APP (Инициализация)
# ==========================
mkdir -p src/app/{providers,styles}
touch src/app/providers/{RouterProvider.tsx,ThemeProvider.tsx,QueryProvider.tsx,SocketProvider.tsx}
touch src/app/styles/index.css
touch src/app/{App.tsx,main.tsx}

# ==========================
# LAYER 6: SHARED (База)
# ==========================
# API, Config, Lib
mkdir -p src/shared/{api,config,lib}
touch src/shared/api/{base.ts,interceptors.ts,types.ts,references.api.ts}
touch src/shared/config/{routes.ts,enums.ts}
touch src/shared/lib/{date.ts,currency.ts,validators.ts,permissions.ts,file.ts}

# UI Kit (Глупые компоненты)
UI_COMPONENTS=("Button" "Input" "Select" "Modal" "Loader" "StatusTag" "ImageUploader")
for component in "${UI_COMPONENTS[@]}"; do
  mkdir -p "src/shared/ui/$component"
  touch "src/shared/ui/$component/index.tsx"
done

# ==========================
# LAYER 5: ENTITIES (Бизнес-сущности)
# ==========================
# Структура: model (types/store), api, ui

# Session
mkdir -p src/entities/session/{model,api}
touch src/entities/session/model/store.ts
touch src/entities/session/api/auth.api.ts

# User
mkdir -p src/entities/user/{model,ui}
touch src/entities/user/model/types.ts
touch src/entities/user/ui/UserAvatar.tsx

# Partner
mkdir -p src/entities/partner/{model,api}
touch src/entities/partner/model/types.ts
touch src/entities/partner/api/partner.api.ts

# Product
mkdir -p src/entities/product/{model,api,ui}
touch src/entities/product/model/types.ts
touch src/entities/product/api/product.api.ts
touch src/entities/product/ui/ProductCard.tsx

# Deal
mkdir -p src/entities/deal/{model,api,ui}
touch src/entities/deal/model/types.ts
touch src/entities/deal/api/deal.api.ts
touch src/entities/deal/ui/{DealStatusBadge.tsx,DealInfoCard.tsx}

# Notification
mkdir -p src/entities/notification/{model,api,ui}
touch src/entities/notification/model/types.ts
touch src/entities/notification/api/notify.api.ts
touch src/entities/notification/ui/NotificationItem.tsx

# ==========================
# LAYER 4: FEATURES (Бизнес-сценарии)
# ==========================

# Auth
mkdir -p src/features/auth/{LoginForm,RegisterForm,LogoutButton}
touch src/features/auth/LoginForm/index.tsx
touch src/features/auth/RegisterForm/index.tsx
touch src/features/auth/LogoutButton/index.tsx

# Catalog
mkdir -p src/features/catalog/{ProductFilters,CreateProductForm}
touch src/features/catalog/ProductFilters/index.tsx
touch src/features/catalog/CreateProductForm/{index.tsx,VariantsStep.tsx,ImagesStep.tsx}

# Trade
mkdir -p src/features/trade/{CreateRfqModal,CreateOfferForm,AcceptDealModal,PayDealButton,AddTrackingModal,ConfirmDeliveryBtn}
touch src/features/trade/CreateRfqModal/index.tsx
touch src/features/trade/CreateOfferForm/index.tsx
touch src/features/trade/AcceptDealModal/index.tsx
touch src/features/trade/PayDealButton/index.tsx
touch src/features/trade/AddTrackingModal/index.tsx
touch src/features/trade/ConfirmDeliveryBtn/index.tsx

# Networking
mkdir -p src/features/networking/PartnerRequestBtn
touch src/features/networking/PartnerRequestBtn/index.tsx

# Profile
mkdir -p src/features/profile/{AddBankAccountForm,AddAddressForm}
touch src/features/profile/AddBankAccountForm/index.tsx
touch src/features/profile/AddAddressForm/index.tsx

# Governance
mkdir -p src/features/governance/{OpenDisputeModal,ResolveDisputeForm,CreateReviewForm}
touch src/features/governance/OpenDisputeModal/index.tsx
touch src/features/governance/ResolveDisputeForm/index.tsx
touch src/features/governance/CreateReviewForm/index.tsx

# Team
mkdir -p src/features/team/{InviteMemberModal,MemberActions}
touch src/features/team/InviteMemberModal/index.tsx
touch src/features/team/MemberActions/index.tsx

# Notifications
mkdir -p src/features/notifications/NotificationBell
touch src/features/notifications/NotificationBell/index.tsx

# Documents
mkdir -p src/features/documents/DownloadDocButton
touch src/features/documents/DownloadDocButton/index.tsx

# ==========================
# LAYER 3: WIDGETS (Крупные блоки)
# ==========================

# Layout
mkdir -p src/widgets/Layout/{Header,Sidebar}
touch src/widgets/Layout/Header/index.tsx
touch src/widgets/Layout/Sidebar/index.tsx

# Specific Widgets
WIDGETS=("CompanyStats" "DealKanban" "DealHistory" "ProductList" "PartnersList" "ArbitrationList" "ModerationList" "NotificationList")
for widget in "${WIDGETS[@]}"; do
  mkdir -p "src/widgets/$widget"
  touch "src/widgets/$widget/index.tsx"
done

# ==========================
# LAYER 2: PAGES (Страницы)
# ==========================

# Auth Pages
mkdir -p src/pages/auth
touch src/pages/auth/{LoginPage.tsx,RegisterPage.tsx}

# Catalog Pages
mkdir -p src/pages/catalog
touch src/pages/catalog/{CatalogPage.tsx,ProductDetails.tsx}

# Trade Pages
mkdir -p src/pages/trade
touch src/pages/trade/{DealsPage.tsx,DealDetailsPage.tsx}

# Networking Pages
mkdir -p src/pages/networking
touch src/pages/networking/PartnersPage.tsx

# Profile Pages
mkdir -p src/pages/profile
touch src/pages/profile/{ProfilePage.tsx,CompanyPage.tsx,StatsPage.tsx}

# Admin Pages
mkdir -p src/pages/admin
touch src/pages/admin/DashboardPage.tsx

echo "✅ Структура фронтенда успешно создана в папке $FRONT_DIR"