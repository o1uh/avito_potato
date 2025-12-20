import { useQuery } from '@tanstack/react-query';
import { Table, Tabs, Tag, Typography, Card, Empty } from 'antd';
import { partnerApi } from '@/entities/partner/api/partner.api';
import { usePermission } from '@/shared/lib/permissions';
import { PartnerRequestBtn } from '@/features/networking/PartnerRequestBtn';
import { Loader } from '@/shared/ui/Loader';
import { RequestStatus, CooperationRequest } from '@/entities/partner/model/types';

const { Title } = Typography;

export const PartnersPage = () => {
  const { companyId } = usePermission();
  
  const { data: requests, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: partnerApi.getRequests,
    // Включаем обновление, так как статусы могут меняться
    staleTime: 1000 * 60, 
  });

  if (isLoading) return <Loader />;

  // 1. Фильтрация данных
  
  // Мои партнеры (Status = APPROVED)
  // Мы ищем записи, где статус 2, и мы либо инициатор, либо получатель.
  const partners = requests?.filter(r => r.request_status_id === RequestStatus.APPROVED) || [];

  // Входящие запросы (Status = PENDING и получатель = мы)
  const incomingRequests = requests?.filter(
    r => r.request_status_id === RequestStatus.PENDING && r.recipient_company_id === companyId
  ) || [];

  // Исходящие запросы (Status = PENDING и инициатор = мы)
  const outgoingRequests = requests?.filter(
    r => r.request_status_id === RequestStatus.PENDING && r.initiator_company_id === companyId
  ) || [];

  // --- Конфигурация колонок таблиц ---

  const partnersColumns = [
    {
      title: 'Компания',
      key: 'company',
      render: (_: any, record: CooperationRequest) => {
        // Определяем, кто "другой" участник
        const isInitiator = record.initiator_company_id === companyId;
        const partner = isInitiator ? record.recipientCompany : record.initiatorCompany;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-base">{partner?.name || 'Неизвестная компания'}</span>
            <span className="text-xs text-gray-400">ИНН: {partner?.inn}</span>
          </div>
        );
      }
    },
    {
      title: 'Дата начала',
      dataIndex: 'updated_at',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Статус',
      key: 'status',
      render: () => <Tag color="success">Активный партнер</Tag>
    }
  ];

  const incomingColumns = [
    {
      title: 'От кого',
      dataIndex: ['initiatorCompany', 'name'],
      key: 'name',
      render: (text: string, record: CooperationRequest) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-400">ИНН: {record.initiatorCompany?.inn}</div>
        </div>
      )
    },
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      render: (text: string) => <span className="text-gray-600 italic">"{text}"</span>
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: CooperationRequest) => (
        <PartnerRequestBtn 
          status="PENDING_INCOMING" 
          requestId={record.id} 
        />
      )
    }
  ];

  const outgoingColumns = [
    {
      title: 'Кому',
      dataIndex: ['recipientCompany', 'name'],
      key: 'name',
    },
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Статус',
      key: 'status',
      render: () => <Tag color="processing">Ожидает подтверждения</Tag>
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: CooperationRequest) => (
        <PartnerRequestBtn 
          status="PENDING_OUTGOING" 
          requestId={record.id} 
        />
      )
    }
  ];

  const items = [
    {
      key: '1',
      label: `Мои партнеры (${partners.length})`,
      children: partners.length > 0 ? (
        <Table 
          columns={partnersColumns} 
          dataSource={partners} 
          rowKey="id" 
          pagination={false} 
        />
      ) : <Empty description="У вас пока нет партнеров" />
    },
    {
      key: '2',
      label: `Входящие запросы (${incomingRequests.length})`,
      children: incomingRequests.length > 0 ? (
        <Table 
          columns={incomingColumns} 
          dataSource={incomingRequests} 
          rowKey="id" 
          pagination={false} 
        />
      ) : <Empty description="Нет новых запросов" />
    },
    {
      key: '3',
      label: `Исходящие (${outgoingRequests.length})`,
      children: (
        <Table 
          columns={outgoingColumns} 
          dataSource={outgoingRequests} 
          rowKey="id" 
          pagination={false} 
        />
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Title level={2}>Деловые связи</Title>
      <Card className="shadow-sm">
        <Tabs defaultActiveKey="1" items={items} />
      </Card>
    </div>
  );
};