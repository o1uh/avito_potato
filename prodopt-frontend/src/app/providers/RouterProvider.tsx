import { createBrowserRouter, RouterProvider as ReactRouterProvider, Navigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { CompanyPage } from '@/pages/profile/CompanyPage';
import { StatsPage } from '@/pages/profile/StatsPage';
import { PartnersPage } from '@/pages/networking/PartnersPage';
// --- ИМПОРТЫ НОВЫХ СТРАНИЦ ---
import { CatalogPage } from '@/pages/catalog/CatalogPage';
import { ProductDetails } from '@/pages/catalog/ProductDetails';
import { useSessionStore } from '@/entities/session/model/store';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useSessionStore((state) => state.isAuth);
  return isAuth ? <>{children}</> : <Navigate to={ROUTES.LOGIN} />;
};

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <AuthGuard><Navigate to={ROUTES.PROFILE} /></AuthGuard>,
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.REGISTER,
    element: <RegisterPage />,
  },
  {
    path: ROUTES.PROFILE,
    element: <AuthGuard><ProfilePage /></AuthGuard>,
  },
  {
    path: ROUTES.COMPANY, 
    element: <AuthGuard><CompanyPage /></AuthGuard>,
  },
  {
    path: '/profile/stats', 
    element: <AuthGuard><StatsPage /></AuthGuard>,
  },
  {
    path: ROUTES.PARTNERS, 
    element: <AuthGuard><PartnersPage /></AuthGuard>,
  },
  // --- НОВЫЕ МАРШРУТЫ КАТАЛОГА ---
  {
    path: ROUTES.CATALOG,
    element: <AuthGuard><CatalogPage /></AuthGuard>,
  },
  {
    // Важно: путь должен совпадать с тем, что генерирует ROUTES.PRODUCT(id)
    // В конфиге routes.ts: PRODUCT: (id) => `/catalog/${id}`
    path: '/catalog/:id', 
    element: <AuthGuard><ProductDetails /></AuthGuard>,
  },
]);

export const RouterProvider = () => {
  return <ReactRouterProvider router={router} />;
};