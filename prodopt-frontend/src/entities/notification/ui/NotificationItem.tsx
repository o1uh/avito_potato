import { List, Typography, Button } from 'antd';
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
  const getIcon = () => {
    // Увеличил размер иконок и добавил отступ справа (через gap родителя)
    switch (item.type) {
      case 'SUCCESS': return <CheckCircleOutlined className="text-green-500 text-xl" />;
      case 'WARNING': return <WarningOutlined className="text-orange-500 text-xl" />;
      case 'ERROR': return <ExclamationCircleOutlined className="text-red-500 text-xl" />;
      default: return <InfoCircleOutlined className="text-blue-500 text-xl" />;
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
        "cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100",
        !item.isRead ? "bg-blue-50/40" : "bg-white"
      )}
      style={{ padding: '12px 16px' }} // Явные отступы внутри блока
      onClick={handleClick}
    >
      <div className="flex w-full gap-4 items-start">
        {/* Иконка */}
        <div className="mt-1 flex-shrink-0">
          {getIcon()}
        </div>

        {/* Контент */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <Text strong={!item.isRead} className="text-sm mr-2 leading-tight">
              {item.title}
            </Text>
            {/* Дата серым и поменьше */}
            <Text type="secondary" className="text-[10px] whitespace-nowrap mt-0.5">
              {dayjs(item.createdAt).format('DD.MM HH:mm')}
            </Text>
          </div>
          
          <div className="text-xs text-gray-500 leading-normal break-words">
            {item.message}
          </div>
        </div>

        {/* Кнопка прочтения (точка) */}
        {!item.isRead && (
          <div className="flex-shrink-0 self-center">
             <Button 
                type="text" 
                size="small" 
                className="text-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onRead(item.id);
                }}
              >
                ●
              </Button>
          </div>
        )}
      </div>
    </List.Item>
  );
};