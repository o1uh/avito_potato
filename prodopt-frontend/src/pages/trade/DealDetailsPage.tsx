import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Typography, Spin, Alert, Button, Steps, List, Empty, Space } from 'antd'; // +Space
import { dealApi } from '@/entities/deal/api/deal.api';
import { DealStatus } from '@/shared/config/enums';
import { usePermission } from '@/shared/lib/permissions';
import { DealStatusBadge } from '@/entities/deal/ui/DealStatusBadge';
import { DealInfoCard } from '@/entities/deal/ui/DealInfoCard';
import { DealHistory } from '@/widgets/DealHistory';
import { PayDealButton } from '@/features/trade/PayDealButton';
import { AddTrackingModal } from '@/features/trade/AddTrackingModal';
import { ConfirmDeliveryBtn } from '@/features/trade/ConfirmDeliveryBtn';
import { DownloadDocButton } from '@/features/documents/DownloadDocButton';
import { OpenDisputeModal } from '@/features/governance/OpenDisputeModal'; // <--- NEW
import { CreateReviewForm } from '@/features/governance/CreateReviewForm'; // <--- NEW
import { useState } from 'react';
import { CarOutlined, FileTextOutlined, WarningOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/shared/lib/currency';
import { $api } from '@/shared/api/base';

const { Title, Text } = Typography;

interface DealDocument {
  id: number;
  entityType: string;
  entityId: number;
  documentType: {
    id: number;
    name: string;
  };
  createdAt: string;
}

export const DealDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const dealId = Number(id);
  const { companyId } = usePermission();
  
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false); // <--- NEW

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealApi.getOne(dealId),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: documents, isLoading: isDocsLoading } = useQuery({
    queryKey: ['deal-documents', id],
    queryFn: async () => {
      const res = await $api.get<DealDocument[]>('/documents/list', {
        params: { entityType: 'deal', entityId: dealId }
      });
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spin size="large" /></div>;
  if (isError || !deal) return <div className="p-10"><Alert type="error" message="Сделка не найдена" /></div>;

  const isBuyer = deal.buyerCompanyId === companyId;
  const isSupplier = deal.supplierCompanyId === companyId;
  const isParticipant = isBuyer || isSupplier;

  // Логика доступности спора
  const canOpenDispute = isParticipant && (deal.dealStatusId === DealStatus.PAID || deal.dealStatusId === DealStatus.SHIPPED);
  
  // Логика доступности отзыва
  const canReview = isParticipant && deal.dealStatusId === DealStatus.COMPLETED;

  const currentStep = () => {
      if (deal.dealStatusId === DealStatus.DISPUTE) return 3; // Визуально стопорим на этапе доставки или подсвечиваем ошибку
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
        
        <Space>
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

            {/* --- GOVERNANCE --- */}
            {canOpenDispute && (
                <Button danger icon={<WarningOutlined />} onClick={() => setIsDisputeModalOpen(true)}>
                    Открыть спор
                </Button>
            )}

            {canReview && (
                <CreateReviewForm dealId={dealId} />
            )}
        </Space>
      </div>

      {/* Модалка спора */}
      <OpenDisputeModal 
        dealId={dealId} 
        isOpen={isDisputeModalOpen} 
        onCancel={() => setIsDisputeModalOpen(false)} 
      />

      <div className="mb-8 px-4">
          <Steps 
            current={currentStep()} 
            status={deal.dealStatusId === DealStatus.DISPUTE ? 'error' : 'process'}
            items={[
                { title: 'Согласование' },
                { title: 'Оплата' },
                { title: 'Отгрузка' },
                { title: 'В пути' },
                { title: 'Завершено' }
            ]}
          />
      </div>

      {/* Если спор открыт, показываем алерт */}
      {deal.dealStatusId === DealStatus.DISPUTE && (
          <Alert 
            type="error" 
            message="Арбитраж"
            description="По данной сделке открыт спор. Средства заморожены до решения администратора."
            showIcon 
            className="mb-6"
          />
      )}

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
            
            <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                    <FileTextOutlined className="text-gray-400" />
                    <Title level={5} className="!m-0">Документы</Title>
                </div>
                
                {isDocsLoading ? (
                    <div className="text-center py-4"><Spin /></div>
                ) : documents && documents.length > 0 ? (
                    <List
                        size="small"
                        dataSource={documents}
                        renderItem={(doc) => (
                            <List.Item className="!px-0 !py-2">
                                <div className="flex justify-between items-center w-full">
                                    <Text className="text-sm">{doc.documentType.name}</Text>
                                    <DownloadDocButton 
                                        documentId={doc.id} 
                                        fileName={`${doc.documentType.name}_${deal.id}.pdf`}
                                        label="PDF"
                                    />
                                </div>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                        description={<span className="text-xs text-gray-400">Документы еще не сформированы</span>} 
                    />
                )}
            </div>
        </Col>
      </Row>
    </div>
  );
};