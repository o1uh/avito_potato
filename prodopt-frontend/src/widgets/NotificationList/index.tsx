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

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifyApi.getMy(false, 20),
  });

  const readMutation = useMutation({
    mutationFn: notifyApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: notifyApi.readAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Логика перехода при клике
  const handleNavigate = (item: Notification) => {
    // 1. Сначала помечаем как прочитанное (если еще не)
    if (!item.isRead) {
      readMutation.mutate(item.id);
    }

    // 2. Логика перехода в зависимости от типа сущности
    if (item.entityType === 'deal' && item.entityId) {
      navigate(ROUTES.DEAL_DETAILS(item.entityId));
      return;
    }

    if (item.entityType === 'offer') {
      navigate(ROUTES.DEALS + '?tab=offers'); 
      return;
    }

    // Если это уведомление о партнерстве (мы на бэке ставили type='system', 
    // но можем определить по тексту или добавить тип 'partnership' в будущем)
    const lowerTitle = item.title.toLowerCase();
    if (lowerTitle.includes('партнер') || lowerTitle.includes('запрос')) {
      navigate(ROUTES.PARTNERS);
      return;
    }
    
    // Для остальных просто остаемся на месте (уведомление уже прочиталось)
  };

  if (isLoading) {
    return <div className="p-4 text-center"><Spin /></div>;
  }

  const listData = data?.data || [];

  return (
    // Увеличили ширину до 400px для комфортного чтения
    <div className="w-[400px] max-h-[500px] flex flex-col bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center px-4 py-3 border-b bg-white sticky top-0 z-10 rounded-t-lg">
        <Typography.Text strong className="text-base">Уведомления</Typography.Text>
        {listData.some(n => !n.isRead) && (
          <Button 
            type="link" 
            size="small" 
            icon={<CheckOutlined />} 
            onClick={() => readAllMutation.mutate()}
            className="p-0 text-xs"
          >
            Все прочитаны
          </Button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 custom-scrollbar">
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
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет новых уведомлений" className="my-10" />
        )}
      </div>
    </div>
  );
};