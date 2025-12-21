import { Layout, Menu, Button, Dropdown, Avatar, Space } from 'antd';
import type { MenuProps } from 'antd'; // <--- Импортируем тип
import { 
  UserOutlined, 
  LogoutOutlined, 
  AppstoreOutlined, 
  ShoppingOutlined, 
  TeamOutlined, 
  SafetyCertificateOutlined 
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { useSessionStore } from '@/entities/session/model/store';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { LogoutButton } from '@/features/auth/LogoutButton';
import { usePermission } from '@/shared/lib/permissions';

const { Header: AntHeader } = Layout;

export const Header = () => {
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const isAuth = useSessionStore((state) => state.isAuth);
  const { isPlatformAdmin } = usePermission();

  // Явно указываем тип массива, чтобы можно было пушить любые ключи (string)
  const menuItems: MenuProps['items'] = [
    { key: ROUTES.CATALOG, label: <Link to={ROUTES.CATALOG}>Каталог</Link>, icon: <ShoppingOutlined /> },
    { key: ROUTES.DEALS, label: <Link to={ROUTES.DEALS}>Сделки</Link>, icon: <AppstoreOutlined /> },
    { key: ROUTES.PARTNERS, label: <Link to={ROUTES.PARTNERS}>Партнеры</Link>, icon: <TeamOutlined /> },
  ];

  // Показываем кнопку ТОЛЬКО Супер-Админу (ID 1)
  if (isPlatformAdmin) {
    menuItems.push({
      key: ROUTES.ADMIN,
      label: <Link to={ROUTES.ADMIN}>Администрирование</Link>,
      icon: <SafetyCertificateOutlined className="text-red-500" />
    });
  }

  const userMenu = {
    items: [
      { 
        key: 'profile', 
        label: <Link to={ROUTES.PROFILE}>Мой профиль</Link>,
        icon: <UserOutlined />
      },
      { 
        key: 'company', 
        label: <Link to={ROUTES.COMPANY}>Моя компания</Link> 
      },
      { 
        type: 'divider' as const 
      },
      { 
        key: 'logout', 
        label: <LogoutButton />, 
        danger: true,
        icon: <LogoutOutlined />
      }
    ]
  };

  return (
    <AntHeader className="bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-50 h-[64px]">
      <div className="flex items-center gap-8">
        <Link to={ROUTES.HOME} className="flex items-center gap-2 text-gray-800 hover:text-primary transition-colors">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
            P
          </div>
          <span className="font-bold text-xl tracking-tight">ProdOpt</span>
        </Link>

        {isAuth && (
          <Menu 
            mode="horizontal" 
            selectedKeys={[location.pathname]} 
            items={menuItems}
            className="border-none min-w-[400px] bg-transparent"
            style={{ lineHeight: '62px' }}
          />
        )}
      </div>

      <div className="flex items-center gap-4">
        {isAuth ? (
          <>
            <NotificationBell />
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 py-1 px-2 rounded-lg transition-colors">
                <Avatar 
                  style={{ backgroundColor: '#10B981' }} 
                  icon={<UserOutlined />} 
                >
                  {user?.fullName?.[0]}
                </Avatar>
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="font-medium text-sm text-gray-700 max-w-[120px] truncate">
                    {user?.fullName}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {user?.roleInCompanyId === 1 ? 'Администратор' : 'Менеджер'}
                  </span>
                </div>
              </div>
            </Dropdown>
          </>
        ) : (
          <Space>
            <Link to={ROUTES.LOGIN}>
              <Button type="text">Войти</Button>
            </Link>
            <Link to={ROUTES.REGISTER}>
              <Button type="primary">Регистрация</Button>
            </Link>
          </Space>
        )}
      </div>
    </AntHeader>
  );
};