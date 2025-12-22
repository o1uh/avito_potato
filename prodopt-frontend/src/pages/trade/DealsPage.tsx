import { useState } from 'react';
import { Tabs, Table, Button, Tag, Typography, Space, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { rfqApi } from '@/entities/deal/api/rfq.api';
import { offerApi } from '@/entities/deal/api/offer.api';
import { usePermission } from '@/shared/lib/permissions';
import { CreateRfqModal } from '@/features/trade/CreateRfqModal';
import { CreateOfferForm } from '@/features/trade/CreateOfferForm';
import { AcceptDealModal } from '@/features/trade/AcceptDealModal'; // Импорт Этапа 9
import { DealKanban } from '@/widgets/DealKanban'; // Импорт Этапа 9
import { PurchaseRequest, CommercialOffer, RequestStatus } from '@/entities/deal/model/types';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom'; 

const { Title } = Typography;

export const DealsPage = () => {
  const { companyId } = usePermission();
  
  // --- Состояния модалок ---
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [offerDrawerState, setOfferDrawerState] = useState<{
      open: boolean;
      rfq?: PurchaseRequest;
      offer?: CommercialOffer;
      readOnly?: boolean;
  }>({ open: false });
  const activeTab = searchParams.get('tab') || 'rfq';
  // Состояние для модалки принятия сделки (Этап 9)
  const [acceptModalState, setAcceptModalState] = useState<{
      open: boolean;
      offer: CommercialOffer | null;
  }>({ open: false, offer: null });

  // --- Запросы данных ---
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

  // --- Обработчики ---
  
  const openCreateOffer = (rfq: PurchaseRequest) => {
      setOfferDrawerState({ open: true, rfq, readOnly: false });
  };

  const openEditOffer = (offer: CommercialOffer) => {
      setOfferDrawerState({ open: true, offer: offer, readOnly: false });
  };

  const openViewOffer = (offer: CommercialOffer) => {
      setOfferDrawerState({ open: true, offer: offer, readOnly: true });
  };

  const openAcceptModal = (offer: CommercialOffer) => {
      setAcceptModalState({ open: true, offer });
  };

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key });
  };
  // --- Колонки таблиц ---

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
            // Если я покупатель - ничего (или статус)
            if (r.buyerCompanyId === companyId) return <Tag>Мой запрос</Tag>;
            
            // Если я поставщик - могу отправить Оффер
            // Проверка: отправлял ли я уже оффер? (на фронте фильтровать сложно без вложенных данных, 
            // поэтому пока просто кнопка, бэк не даст создать дубль если есть валидация)
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
              const map: Record<number, string> = { 1: 'Sent', 2: 'Accepted', 3: 'Rejected' };
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
                  // Я Поставщик
                  return o.offerStatusId === 1 ? (
                      <Button icon={<EditOutlined />} onClick={() => openEditOffer(o)}>Изменить</Button>
                  ) : <Button icon={<EyeOutlined />} onClick={() => openViewOffer(o)} />;
              } else {
                  // Я Покупатель
                  return (
                      <Space>
                          <Button icon={<EyeOutlined />} onClick={() => openViewOffer(o)}>Просмотр</Button>
                          
                          {/* Кнопка "Принять" доступна только для активных офферов */}
                          {o.offerStatusId === 1 && (
                              <Tooltip title="Создать сделку">
                                  <Button 
                                    type="primary" 
                                    icon={<CheckCircleOutlined />} 
                                    onClick={() => openAcceptModal(o)}
                                  >
                                      Принять
                                  </Button>
                              </Tooltip>
                          )}
                      </Space>
                  );
              }
          }
      }
  ];

  // --- Табы ---
  const items = [
    {
      key: 'rfq',
      label: 'Запросы на закупку',
      children: (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <span className="text-gray-500">Активные запросы на рынке и мои собственные.</span>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRfqModalOpen(true)}>
                      Создать запрос
                  </Button>
              </div>
              <Table 
                  columns={rfqColumns} 
                  // Показываем только новые запросы
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
        // Виджет Канбан из Этапа 9
        children: <DealKanban />
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <Title level={2} className="!m-0">Торговля</Title>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange} 
        items={items} 
      />

      {/* Модалка создания RFQ */}
      <CreateRfqModal 
        open={isRfqModalOpen} 
        onCancel={() => setIsRfqModalOpen(false)} 
      />

      {/* Дровер создания/просмотра Оффера */}
      <CreateOfferForm 
        open={offerDrawerState.open}
        onClose={() => setOfferDrawerState({ open: false })}
        rfq={offerDrawerState.rfq}
        existingOffer={offerDrawerState.offer}
        readOnly={offerDrawerState.readOnly}
      />

      {/* Модалка принятия сделки */}
      {acceptModalState.offer && (
          <AcceptDealModal 
            open={acceptModalState.open}
            offer={acceptModalState.offer}
            onCancel={() => setAcceptModalState({ open: false, offer: null })}
          />
      )}
    </div>
  );
};