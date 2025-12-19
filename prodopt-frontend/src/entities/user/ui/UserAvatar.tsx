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
    <Avatar size={size} style={{ backgroundColor: '#1677ff', verticalAlign: 'middle' }}>
      {initials}
    </Avatar>
  );
};