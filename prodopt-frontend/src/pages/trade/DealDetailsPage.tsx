import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Typography, Spin, Alert, Button, Steps } from 'antd';
import { dealApi } from '@/entities/deal/api/deal.api';
import { DealStatus } from '@/shared/config/enums';
import { usePermission } from '@/shared/lib/permissions';
import { DealStatusBadge } from '@/entities/deal/ui/DealStatusBadge';
import { DealInfoCard } from '@/entities/deal/ui/DealInfoCard';
import { DealHistory } from '@/widgets/DealHistory';
import { PayDealButton } from '@/features/trade/PayDealButton';
import { AddTrackingModal } from '@/features/trade/AddTrackingModal';
import { ConfirmDeliveryBtn } from '@/features/trade/ConfirmDeliveryBtn';
import { useState } from 'react';
import { CarOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/shared/lib/currency'; // Добавлен импорт

const { Title, Text } = Typography;

export const DealDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const dealId = Number(id);
  const { companyId } = usePermission();
  
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealApi.getOne(dealId),
    enabled: !!id,
    refetchInterval: 5000,
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spin size="large" /></div>;
  if (isError || !deal) return <div className="p-10"><Alert type="error" message="Сделка не найдена" /></div>;

  const isBuyer = deal.buyerCompanyId === companyId;
  const isSupplier = deal.supplierCompanyId === companyId;

  const currentStep = () => {
      if (deal.dealStatusId >= DealStatus.COMPLETED) return 4;
      if (deal.dealStatusId === DealStatus.SHIPPED) return 3;
      if (deal.dealStatusId === DealStatus.PAID) return 2;
      if (deal.dealStatusId === DealStatus.AGREED) return 1;
      return 0;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Title level={2} className="!m-0">Сделка #{deal.id}</Title>
            <DealStatusBadge status={deal.dealStatusId} />
          </div>
          <Text type="secondary">
            {isBuyer ? `Поставщик: ${deal.supplier?.name}` : `Покупатель: ${deal.buyer?.name}`}
          </Text>
        </div>
        
        <div className="flex gap-3">
            {isBuyer && deal.dealStatusId === DealStatus.AGREED && (
                <PayDealButton deal={deal} />
            )}

            {isSupplier && deal.dealStatusId === DealStatus.PAID && (
                <>
                    <Button type="primary" size="large" icon={<CarOutlined />} onClick={() => setIsTrackingModalOpen(true)}>
                        Отгрузить заказ
                    </Button>
                    <AddTrackingModal 
                        dealId={dealId} 
                        open={isTrackingModalOpen} 
                        onCancel={() => setIsTrackingModalOpen(false)} 
                    />
                </>
            )}

            {isBuyer && deal.dealStatusId === DealStatus.SHIPPED && (
                <ConfirmDeliveryBtn dealId={dealId} />
            )}
        </div>
      </div>

      <div className="mb-8 px-4">
          <Steps 
            current={currentStep()} 
            items={[
                { title: 'Согласование' },
                { title: 'Оплата' },
                { title: 'Отгрузка' },
                { title: 'В пути' },
                { title: 'Завершено' }
            ]}
          />
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <Title level={4}>Состав заказа</Title>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="p-2">Товар</th>
                                <th className="p-2">Кол-во</th>
                                <th className="p-2">Цена</th>
                                <th className="p-2">Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deal.items?.map((item: any) => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-2">{item.productNameAtDealMoment}</td>
                                    <td className="p-2">{item.quantity} {item.measurementUnitAtDealMoment}</td>
                                    <td className="p-2">{formatCurrency(item.pricePerUnit)}</td>
                                    <td className="p-2">{formatCurrency(item.pricePerUnit * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <DealHistory deal={deal} />
        </Col>

        <Col xs={24} md={8}>
            <DealInfoCard deal={deal} isSupplier={isSupplier} />
            
            <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 opacity-50">
                <Title level={5}>Документы</Title>
                <Text type="secondary">Генерация документов будет доступна в следующем обновлении.</Text>
            </div>
        </Col>
      </Row>
    </div>
  );
};