import { useState } from 'react';
import { Tabs, Table, Button, Tag, Typography, Space, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { rfqApi } from '@/entities/deal/api/rfq.api';
import { offerApi } from '@/entities/deal/api/offer.api';
import { usePermission } from '@/shared/lib/permissions';
import { CreateRfqModal } from '@/features/trade/CreateRfqModal';
import { CreateOfferForm } from '@/features/trade/CreateOfferForm';
import { PurchaseRequest, CommercialOffer, RequestStatus } from '@/entities/deal/model/types';
import { AcceptDealModal } from '@/features/trade/AcceptDealModal'; // Будет реализовано на этапе 9, пока заглушка или импорт если есть
import dayjs from 'dayjs';

const { Title } = Typography;

export const DealsPage = () => {
  const { companyId } = usePermission();
  
  // States for Modals
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  
  const [offerDrawerState, setOfferDrawerState] = useState<{
      open: boolean;
      rfq?: PurchaseRequest;
      offer?: CommercialOffer;
      readOnly?: boolean;
  }>({ open: false });

  // --- Queries ---
  const { data: rfqList, isLoading: isRfqLoading } = useQuery({
    queryKey: ['rfq-list'],
    queryFn: rfqApi.getAll,
  });

  const { data: sentOffers, isLoading: isSentOffersLoading } = useQuery({
    queryKey: ['offers-list', 'sent'],
    queryFn: () => offerApi.getAll('sent'),
  });

  const { data: receivedOffers, isLoading: isReceivedOffersLoading } = useQuery({
    queryKey: ['offers-list', 'received'],
    queryFn: () => offerApi.getAll('received'),
  });

  // --- Handlers ---
  const openCreateOffer = (rfq: PurchaseRequest) => {
      setOfferDrawerState({ open: true, rfq, readOnly: false });
  };

  const openEditOffer = (offer: CommercialOffer) => {
      setOfferDrawerState({ open: true, offer: offer, readOnly: false });
  };

  const openViewOffer = (offer: CommercialOffer) => {
      setOfferDrawerState({ open: true, offer: offer, readOnly: true });
  };

  // --- Columns ---

  const rfqColumns = [
    {
      title: 'Товар',
      key: 'product',
      render: (_: any, r: PurchaseRequest) => (
          <div>
              <div className="font-medium">{r.targetVariant?.product?.name || 'Товар'}</div>
              <div className="text-xs text-gray-500">{r.targetVariant?.variantName} ({r.requestedQuantity} шт)</div>
          </div>
      )
    },
    {
        title: 'Тип',
        key: 'type',
        render: (_: any, r: PurchaseRequest) => (
            r.supplierCompanyId ? <Tag color="purple">Приватный</Tag> : <Tag color="blue">Публичный</Tag>
        )
    },
    {
        title: 'Покупатель',
        dataIndex: ['buyer', 'name'],
        key: 'buyer',
    },
    {
        title: 'Комментарий',
        dataIndex: 'comment',
        key: 'comment',
        ellipsis: true,
    },
    {
        title: 'Дата',
        dataIndex: 'createdAt',
        render: (d: string) => dayjs(d).format('DD.MM.YYYY')
    },
    {
        title: 'Действия',
        key: 'actions',
        render: (_: any, r: PurchaseRequest) => {
            // Если я покупатель - ничего (или редактировать)
            if (r.buyerCompanyId === companyId) return <Tag>Мой запрос</Tag>;
            
            // Если я поставщик - могу отправить Оффер
            return (
                <Button type="primary" size="small" onClick={() => openCreateOffer(r)}>
                    Предложить КП
                </Button>
            );
        }
    }
  ];

  const offersColumns = [
      {
          title: 'Запрос (RFQ)',
          key: 'rfq',
          render: (_: any, o: CommercialOffer) => (
              <span>#{o.purchaseRequest?.id} {o.purchaseRequest?.targetVariant?.product?.name}</span>
          )
      },
      {
          title: 'Контрагент',
          key: 'counterparty',
          render: (_: any, o: CommercialOffer) => {
              const isMine = o.supplierCompanyId === companyId;
              return isMine 
                ? <span>Покупатель: {o.purchaseRequest?.buyer?.name}</span>
                : <span>Поставщик: {o.supplier?.name}</span>
          }
      },
      {
          title: 'Сумма',
          dataIndex: 'offerPrice',
          key: 'price',
          render: (p: number) => <strong>{Number(p).toLocaleString()} ₽</strong>
      },
      {
          title: 'Статус',
          dataIndex: 'offerStatusId',
          key: 'status',
          render: (id: number) => {
              const map: Record<number, any> = { 1: 'Sent', 2: 'Accepted', 3: 'Rejected' };
              const colors: Record<number, string> = { 1: 'blue', 2: 'green', 3: 'red' };
              return <Tag color={colors[id]}>{map[id]}</Tag>;
          }
      },
      {
          title: 'Действия',
          key: 'actions',
          render: (_: any, o: CommercialOffer) => {
              const isMine = o.supplierCompanyId === companyId;
              
              if (isMine) {
                  return o.offerStatusId === 1 ? (
                      <Button icon={<EditOutlined />} onClick={() => openEditOffer(o)}>Изменить</Button>
                  ) : <Button icon={<EyeOutlined />} onClick={() => openViewOffer(o)} />;
              } else {
                  // Я покупатель
                  return (
                      <Space>
                          <Button icon={<EyeOutlined />} onClick={() => openViewOffer(o)}>Просмотр</Button>
                          {/* Кнопка принятия будет внутри формы просмотра или тут, 
                              но логика AcceptDealModal (Stage 9) требует отдельной модалки.
                              Здесь пока оставим просмотр. */}
                          {o.offerStatusId === 1 && (
                              <AcceptDealModalTrigger offer={o} />
                          )}
                      </Space>
                  );
              }
          }
      }
  ];

  // Табы
  const items = [
    {
      key: 'rfq',
      label: 'Запросы на закупку',
      children: (
          <div className="space-y-4">
              <div className="flex justify-between">
                  <span>Активные запросы на рынке и мои собственные.</span>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRfqModalOpen(true)}>
                      Создать запрос
                  </Button>
              </div>
              <Table 
                  columns={rfqColumns} 
                  dataSource={rfqList?.filter(r => r.requestStatusId === RequestStatus.NEW)} 
                  rowKey="id" 
                  loading={isRfqLoading} 
              />
          </div>
      ),
    },
    {
      key: 'offers',
      label: 'Коммерческие предложения',
      children: (
          <div className="space-y-8">
              <div>
                  <Title level={5}>Входящие предложения (Мне)</Title>
                  <Table 
                      columns={offersColumns} 
                      dataSource={receivedOffers} 
                      rowKey="id" 
                      loading={isReceivedOffersLoading} 
                      pagination={{ pageSize: 5 }}
                  />
              </div>
              <div>
                  <Title level={5}>Исходящие предложения (Мои)</Title>
                  <Table 
                      columns={offersColumns} 
                      dataSource={sentOffers} 
                      rowKey="id" 
                      loading={isSentOffersLoading} 
                      pagination={{ pageSize: 5 }}
                  />
              </div>
          </div>
      ),
    },
    {
        key: 'deals',
        label: 'Сделки',
        children: <div className="p-10 text-center text-gray-400">Канбан доска будет доступна на следующем этапе</div>
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <Title level={2} className="!m-0">Торговля</Title>
      </div>

      <Tabs defaultActiveKey="rfq" items={items} />

      <CreateRfqModal 
        open={isRfqModalOpen} 
        onCancel={() => setIsRfqModalOpen(false)} 
      />

      <CreateOfferForm 
        open={offerDrawerState.open}
        onClose={() => setOfferDrawerState({ open: false })}
        rfq={offerDrawerState.rfq}
        existingOffer={offerDrawerState.offer}
        readOnly={offerDrawerState.readOnly}
      />
    </div>
  );
};

// Заглушка для кнопки принятия (Stage 9 dependency)
// В реальном коде это будет импорт из features/trade/AcceptDealModal
const AcceptDealModalTrigger = ({ offer }: { offer: CommercialOffer }) => {
    // Временно, чтобы кнопка была, но не ломала сборку отсутствием компонента
    return (
        <Tooltip title="Функционал создания сделки (Этап 9)">
            <Button type="primary" icon={<CheckCircleOutlined />} disabled>
                Принять
            </Button>
        </Tooltip>
    );
};