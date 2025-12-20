import { useState } from 'react';
import { Button, Modal, Input, message, Tooltip } from 'antd';
import { UserAddOutlined, CheckOutlined, CloseOutlined, ClockCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerApi } from '@/entities/partner/api/partner.api';
import { PartnerRelationStatus } from '@/entities/partner/model/types';

interface Props {
  targetCompanyId?: number; // Если кнопка в каталоге/профиле
  requestId?: number;       // Если кнопка в списке входящих запросов
  status: PartnerRelationStatus;
  companyName?: string;     // Для модалки
}

export const PartnerRequestBtn = ({ targetCompanyId, requestId, status, companyName }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('Здравствуйте! Хотим стать вашим партнером.');
  
  const queryClient = useQueryClient();

  // Мутация: Отправка запроса
  const sendMutation = useMutation({
    mutationFn: () => partnerApi.sendRequest(targetCompanyId!, requestMessage),
    onSuccess: () => {
      message.success('Запрос отправлен');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
    onError: () => message.error('Не удалось отправить запрос')
  });

  // Мутация: Принять запрос
  const approveMutation = useMutation({
    mutationFn: () => partnerApi.approveRequest(requestId!),
    onSuccess: () => {
      message.success('Партнер добавлен');
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
    onError: () => message.error('Ошибка при добавлении')
  });

  // Мутация: Отклонить запрос (пока визуальная)
  const rejectMutation = useMutation({
    mutationFn: () => partnerApi.rejectRequest(requestId!),
    onSuccess: () => {
      message.info('Функция отклонения в разработке');
    }
  });

  // Рендеринг в зависимости от статуса
  switch (status) {
    case 'APPROVED':
      return (
        <Button type="text" icon={<TeamOutlined />} className="text-green-600" disabled>
          Партнер
        </Button>
      );

    case 'PENDING_OUTGOING':
      return (
        <Tooltip title="Запрос ожидает подтверждения">
          <Button icon={<ClockCircleOutlined />} disabled>
            Отправлен
          </Button>
        </Tooltip>
      );

    case 'PENDING_INCOMING':
      return (
        <div className="flex gap-2">
          <Button 
            type="primary" 
            icon={<CheckOutlined />} 
            onClick={() => approveMutation.mutate()}
            loading={approveMutation.isPending}
          >
            Принять
          </Button>
          <Button 
            danger 
            icon={<CloseOutlined />} 
            onClick={() => rejectMutation.mutate()}
            // Скрываем, пока нет API, или оставляем как заглушку
            disabled
          >
            Откл.
          </Button>
        </div>
      );

    case 'NONE':
    default:
      return (
        <>
          <Button type="dashed" icon={<UserAddOutlined />} onClick={() => setIsModalOpen(true)}>
            Добавить
          </Button>

          <Modal
            title={`Партнерство с ${companyName || 'компанией'}`}
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            onOk={() => sendMutation.mutate()}
            confirmLoading={sendMutation.isPending}
            okText="Отправить запрос"
            cancelText="Отмена"
          >
            <p className="mb-2 text-gray-500">Напишите сопроводительное сообщение:</p>
            <Input.TextArea 
              rows={4} 
              value={requestMessage} 
              onChange={(e) => setRequestMessage(e.target.value)} 
            />
          </Modal>
        </>
      );
  }
};