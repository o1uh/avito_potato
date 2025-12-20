import { List, Button, Empty, Spin, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifyApi } from '@/entities/notification/api/notify.api';
import { NotificationItem } from '@/entities/notification/ui/NotificationItem';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { Notification } from '@/entities/notification/model/types';

export const NotificationList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Получение уведомлений
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifyApi.getMy(false, 20), // 20 последних
  });

  // Мутация: Прочитать одно
  const readMutation = useMutation({
    mutationFn: notifyApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Мутация: Прочитать все
  const readAllMutation = useMutation({
    mutationFn: notifyApi.readAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNavigate = (item: Notification) => {
    if (item.entityType === 'deal' && item.entityId) {
      navigate(ROUTES.DEAL_DETAILS(item.entityId));
    }
    // Здесь можно добавить переходы для других сущностей (spores, tickets)
  };

  if (isLoading) {
    return <div className="p-4 text-center"><Spin /></div>;
  }

  const listData = data?.data || [];

  return (
    <div className="w-[350px] max-h-[500px] flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 border-b bg-white sticky top-0 z-10">
        <Typography.Text strong>Уведомления</Typography.Text>
        {listData.some(n => !n.isRead) && (
          <Button 
            type="link" 
            size="small" 
            icon={<CheckOutlined />} 
            onClick={() => readAllMutation.mutate()}
            className="p-0"
          >
            Все прочитаны
          </Button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {listData.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={listData}
            renderItem={(item) => (
              <NotificationItem 
                item={item} 
                onRead={(id) => readMutation.mutate(id)}
                onClick={handleNavigate}
              />
            )}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет уведомлений" className="my-8" />
        )}
      </div>
    </div>
  );
};