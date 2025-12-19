import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface Props {
  name?: string;
  size?: number | 'small' | 'large' | 'default';
}

export const UserAvatar = ({ name, size = 'default' }: Props) => {
  if (!name) return <Avatar size={size} icon={<UserOutlined />} />;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    // Используем hex код зеленого цвета (#10B981)
    <Avatar size={size} style={{ backgroundColor: '#10B981', verticalAlign: 'middle', fontSize: typeof size === 'number' ? size / 2.5 : undefined }}>
      {initials}
    </Avatar>
  );
};