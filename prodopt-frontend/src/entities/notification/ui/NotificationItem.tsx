import { List, Typography, Badge, Button } from 'antd';
import { 
  InfoCircleOutlined, 
  CheckCircleOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { Notification } from '../model/types';
import dayjs from 'dayjs';
import clsx from 'clsx';

const { Text } = Typography;

interface Props {
  item: Notification;
  onRead: (id: number) => void;
  onClick?: (item: Notification) => void;
}

export const NotificationItem = ({ item, onRead, onClick }: Props) => {
  // Иконка в зависимости от типа
  const getIcon = () => {
    switch (item.type) {
      case 'SUCCESS': return <CheckCircleOutlined className="text-green-500 text-lg" />;
      case 'WARNING': return <WarningOutlined className="text-orange-500 text-lg" />;
      case 'ERROR': return <ExclamationCircleOutlined className="text-red-500 text-lg" />;
      default: return <InfoCircleOutlined className="text-blue-500 text-lg" />;
    }
  };

  const handleClick = () => {
    if (!item.isRead) {
      onRead(item.id);
    }
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <List.Item 
      className={clsx(
        "cursor-pointer hover:bg-gray-50 transition-colors px-4 py-3 border-b border-gray-100",
        !item.isRead ? "bg-blue-50/30" : "bg-white"
      )}
      onClick={handleClick}
      actions={[
        !item.isRead && (
          <Button 
            type="text" 
            size="small" 
            className="text-xs text-blue-500"
            onClick={(e) => {
              e.stopPropagation();
              onRead(item.id);
            }}
          >
            ●
          </Button>
        )
      ]}
    >
      <List.Item.Meta
        avatar={getIcon()}
        title={
          <div className="flex justify-between items-start">
            <Text strong={!item.isRead} className="mr-2 text-sm">{item.title}</Text>
            <Text type="secondary" className="text-xs whitespace-nowrap">
              {dayjs(item.createdAt).format('DD.MM HH:mm')}
            </Text>
          </div>
        }
        description={
          <div className="text-xs text-gray-500 line-clamp-2">
            {item.message}
          </div>
        }
      />
    </List.Item>
  );
};