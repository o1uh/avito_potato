export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: '/profile',
  COMPANY: '/profile/company',
  CATALOG: '/catalog',
  CATALOG_CREATE: '/catalog/create', // <-- Добавлено (опционально, для использования в Link)
  PRODUCT: (id: string | number) => `/catalog/${id}`,
  DEALS: '/trade/deals',
  DEAL_DETAILS: (id: string | number) => `/trade/deals/${id}`,
  PARTNERS: '/networking',
  ADMIN: '/admin',
} as const;