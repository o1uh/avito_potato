import { Card, Descriptions, Typography, Tooltip, Space } from 'antd';
import { Deal } from '../model/types';
import { formatCurrency } from '@/shared/lib/currency';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DealStatus } from '@/shared/config/enums';

const { Text } = Typography;

interface Props {
  deal: Deal;
  isSupplier: boolean;
}

export const DealInfoCard = ({ deal, isSupplier }: Props) => {
  const totalAmount = Number(deal.totalAmount);
  const fee = Number(deal.escrowAccount?.platformFeeAmount || 0);
  const toReceive = totalAmount - fee;
  
  const isPaid = deal.dealStatusId >= DealStatus.PAID;

  // Формируем строку адреса
  const address = deal.deliveryAddress;
  const addressString = address 
    ? [address.postalCode, address.country, address.city, address.street, address.house]
        .filter(Boolean)
        .join(', ') 
    : null;

  return (
    <Card className="shadow-sm border-gray-200 h-full" title="Финансы и Логистика">
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Сумма сделки">
          <Text strong className="text-lg">{formatCurrency(totalAmount)}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Статус оплаты">
          {isPaid ? (
            <span className="text-green-600 font-medium">Оплачено</span>
          ) : (
            <span className="text-orange-500">Ожидает оплаты</span>
          )}
        </Descriptions.Item>

        {isSupplier && (
          <>
            <Descriptions.Item label="Комиссия платформы">
              <span className="text-gray-500">{formatCurrency(fee)}</span>
            </Descriptions.Item>
            <Descriptions.Item label={
              <Space>
                К выплате
                <Tooltip title="Сумма, которая поступит на ваш счет после завершения сделки">
                  <InfoCircleOutlined className="text-gray-400" />
                </Tooltip>
              </Space>
            }>
              <Text type="success" strong>{formatCurrency(toReceive)}</Text>
            </Descriptions.Item>
          </>
        )}

        {deal.shipments && deal.shipments.length > 0 && (
          <>
            <Descriptions.Item label="Трек-номер">
              <Text copyable>{deal.shipments[0].trackingNumber}</Text>
              <div className="text-xs text-gray-400">{deal.shipments[0].logisticsService}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Дата отправки">
              {dayjs(deal.shipments[0].sentAt).format('DD.MM.YYYY')}
            </Descriptions.Item>
          </>
        )}
        
        <Descriptions.Item label="Адрес доставки">
            {addressString ? (
                <div className="text-xs whitespace-pre-wrap">
                    {addressString}
                    {/* Комментарий удален из отображения */}
                </div>
            ) : (
                <span className="text-gray-400 italic">Не указан</span>
            )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};