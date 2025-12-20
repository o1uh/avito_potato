import { useEffect } from 'react';
import { Badge, Popover, notification } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useSocket } from '@/app/providers/SocketProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifyApi } from '@/entities/notification/api/notify.api';
import { NotificationList } from '@/widgets/NotificationList';
import { useSessionStore } from '@/entities/session/model/store';

export const NotificationBell = () => {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const isAuth = useSessionStore((state) => state.isAuth);

  // Запрашиваем количество непрочитанных при загрузке
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifyApi.getMy(false, 20),
    enabled: isAuth, // Только если авторизован
    refetchInterval: 60000, // Поллинг раз в минуту на всякий случай
  });

  const unreadCount = data?.meta?.unreadCount || 0;

  useEffect(() => {
    if (!socket || !isAuth) return;

    // Подписка на личные уведомления
    // Бэкенд должен отправлять событие 'notification' в комнату пользователя
    socket.on('notification', (payload: any) => {
      // 1. Обновляем список (инвалидируем кэш)
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // 2. Показываем всплывающее уведомление (Toast)
      notification.open({
        message: payload.title || 'Новое уведомление',
        description: payload.message,
        placement: 'bottomRight',
        duration: 4,
        type: payload.type?.toLowerCase() || 'info',
        onClick: () => {
          // Здесь можно добавить логику перехода, если нужно
          console.log('Notification clicked', payload);
        },
      });
    });

    return () => {
      socket.off('notification');
    };
  }, [socket, isAuth, queryClient]);

  if (!isAuth) return null;

  return (
    <Popover 
      content={<NotificationList />} 
      trigger="click" 
      placement="bottomRight"
      overlayClassName="p-0"
      overlayInnerStyle={{ padding: 0 }}
    >
      <div className="cursor-pointer px-2 flex items-center">
        <Badge count={unreadCount} overflowCount={99} size="small">
          <BellOutlined style={{ fontSize: '20px', color: '#4B5563' }} />
        </Badge>
      </div>
    </Popover>
  );
};