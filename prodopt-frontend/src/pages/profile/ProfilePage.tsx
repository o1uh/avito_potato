import { Descriptions, Card, Tag } from 'antd';
import { useSessionStore } from '@/entities/session/model/store';
import { LogoutButton } from '@/features/auth/LogoutButton';
import { UserAvatar } from '@/entities/user/ui/UserAvatar';

export const ProfilePage = () => {
  const user = useSessionStore((state) => state.user);

  if (!user) return null;

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <Card 
        title="Профиль пользователя" 
        extra={<LogoutButton />}
      >
        <div className="flex items-center mb-6 gap-4">
          <UserAvatar name={user.fullName} size={64} />
          <div>
            <h2 className="m-0">{user.fullName}</h2>
            <Tag color="blue">{user.roleInCompanyId === 1 ? 'Администратор' : 'Менеджер'}</Tag>
          </div>
        </div>

        <Descriptions bordered column={1}>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Телефон">{user.phone || 'Не указан'}</Descriptions.Item>
          <Descriptions.Item label="Должность">{user.position || 'Не указана'}</Descriptions.Item>
          <Descriptions.Item label="Компания">{user.company?.name}</Descriptions.Item>
          <Descriptions.Item label="ИНН компании">{user.company?.inn}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};