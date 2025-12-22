import { useEffect } from 'react';
import { Badge, Popover, notification, Button, message } from 'antd';
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

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifyApi.getMy(false, 20),
    enabled: isAuth,
    refetchInterval: 60000, 
  });

  const unreadCount = data?.meta?.unreadCount || 0;

  useEffect(() => {
    if (!socket || !isAuth) return;

    socket.on('notification', (payload: any) => {
      // 1. Инвалидируем кэш, чтобы список обновился (и счетчик)
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      queryClient.invalidateQueries({ queryKey: ['offers-list'] });
      queryClient.invalidateQueries({ queryKey: ['rfq-list'] });
      queryClient.invalidateQueries({ queryKey: ['deals-list'] });
      // 2. Показываем всплывающее уведомление
      notification.open({
        message: payload.title || 'Новое уведомление',
        description: payload.message,
        placement: 'bottomRight',
        duration: 4,
        type: payload.type?.toLowerCase() || 'info',
        // Можно добавить иконку, если тип SUCCESS и т.д.
      });
    });

    return () => {
      socket.off('notification');
    };
  }, [socket, isAuth, queryClient]);

  // --- ОБНОВЛЕННАЯ ФУНКЦИЯ ---
  const handleTestNotification = async () => {
    try {
      await notifyApi.sendTest();
      message.success('Запрос отправлен на сервер...');
    } catch (e) {
      message.error('Ошибка отправки теста');
    }
  };
  // ---------------------------

  if (!isAuth) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Кнопка теперь отправляет запрос на сервер */}
      <Button size="small" onClick={handleTestNotification} type="dashed">
        Test API
      </Button>

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
    </div>
  );
};