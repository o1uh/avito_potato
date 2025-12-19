import { createBrowserRouter, RouterProvider as ReactRouterProvider } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <div className="p-10"><h1>ProdOpt Platform (Stage 1 Init)</h1><p>Frontend initialized successfully.</p></div>,
  },
  {
    path: ROUTES.LOGIN,
    element: <div>Login Page Placeholder</div>,
  },
  // Остальные роуты добавим на соответствующих этапах
]);

export const RouterProvider = () => {
  return <ReactRouterProvider router={router} />;
};