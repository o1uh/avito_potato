import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Шапка с колокольчиком всегда сверху */}
      <Header />
      
      {/* Сюда подставляется контент текущей страницы */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};