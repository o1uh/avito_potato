import { Descriptions, Card, Tag, Button} from 'antd'; // Добавил Button, Space
import { useSessionStore } from '@/entities/session/model/store';
import { LogoutButton } from '@/features/auth/LogoutButton';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';
import { Link } from 'react-router-dom'; // Импорт Link
import { ROUTES } from '@/shared/config/routes'; // Импорт путей

export const ProfilePage = () => {
  const user = useSessionStore((state) => state.user);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* --- ВРЕМЕННАЯ НАВИГАЦИЯ --- */}
        <div className="mb-6 flex gap-4">
            <Link to={ROUTES.COMPANY}>
                <Button>🏢 Моя компания</Button>
            </Link>
            <Link to="/profile/stats">
                <Button>📊 Аналитика</Button>
            </Link>
        </div>
        {/* --------------------------- */}

        <Card 
          title={<span className="text-lg">Профиль пользователя</span>}
          extra={<LogoutButton />}
          className="shadow-sm border-gray-200"
          style={{ borderColor: '#E5E7EB' }}
        >
          {/* ... остальной код профиля без изменений ... */}
          <div className="flex items-center mb-8 gap-5 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <UserAvatar name={user.fullName} size={80} />
            <div>
              <h2 className="text-2xl font-bold text-gray-800 m-0 mb-1">{user.fullName}</h2>
              <Tag color="success" className="text-sm px-3 py-0.5">
                {user.roleInCompanyId === 1 ? 'Администратор' : 'Менеджер'}
              </Tag>
            </div>
          </div>

          <Descriptions bordered column={1} size="middle" labelStyle={{ width: '200px', color: '#6B7280' }}>
            <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
            <Descriptions.Item label="Телефон">{user.phone || 'Не указан'}</Descriptions.Item>
            <Descriptions.Item label="Должность">{user.position || 'Не указана'}</Descriptions.Item>
            <Descriptions.Item label="Компания">
              <span className="font-medium text-gray-900">{user.company?.name}</span>
            </Descriptions.Item>
            <Descriptions.Item label="ИНН компании">{user.company?.inn}</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </div>
  );
};