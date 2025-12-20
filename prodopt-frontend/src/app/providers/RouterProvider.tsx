import { createBrowserRouter, RouterProvider as ReactRouterProvider, Navigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { CompanyPage } from '@/pages/profile/CompanyPage';
import { StatsPage } from '@/pages/profile/StatsPage';
import { useSessionStore } from '@/entities/session/model/store';

// Компонент-защитник для авторизованных зон
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useSessionStore((state) => state.isAuth);
  return isAuth ? <>{children}</> : <Navigate to={ROUTES.LOGIN} />;
};

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <AuthGuard><Navigate to={ROUTES.PROFILE} /></AuthGuard>, // Для MVP перенаправим в профиль
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
]);

export const RouterProvider = () => {
  return <ReactRouterProvider router={router} />;
};