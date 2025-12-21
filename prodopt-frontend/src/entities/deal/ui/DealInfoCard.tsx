import { Card, Descriptions, Typography, Tooltip } from 'antd';
import { Deal } from '../model/types';
import { formatCurrency } from '@/shared/lib/currency';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
  deal: Deal;
  isSupplier: boolean;
}

export const DealInfoCard = ({ deal, isSupplier }: Props) => {
  // Расчеты
  const totalAmount = Number(deal.totalAmount);
  const deposited = Number(deal.escrowAccount?.amountDeposited || 0);
  const fee = Number(deal.escrowAccount?.platformFeeAmount || 0);
  
  // Для поставщика показываем "К получению" (сумма - комиссия)
  const toReceive = totalAmount - fee;

  return (
    <Card className="shadow-sm border-gray-200 h-full" title="Финансы и Логистика">
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Сумма сделки">
          <Text strong className="text-lg">{formatCurrency(totalAmount)}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Статус оплаты">
          {deposited >= totalAmount ? (
            <span className="text-green-600 font-medium">Оплачено (100%)</span>
          ) : (
            <span className="text-orange-500">Ожидает оплаты</span>
          )}
        </Descriptions.Item>

        {/* Секция для Поставщика */}
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

        {/* Логистика */}
        {deal.shipments && deal.shipments.length > 0 && (
          <>
            <Descriptions.Item label="Трек-номер">
              <Text copyable>{deal.shipments[0].trackingNumber}</Text>
              <div className="text-xs text-gray-400">{deal.shipments[0].logisticsService}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Дата отправки">
              {dayjs(deal.shipments[0].sentAt).format('DD.MM.YYYY')}
            </Descriptions.Item>
            {deal.shipments[0].expectedDeliveryDate && (
                <Descriptions.Item label="Ожидаемая доставка">
                    {dayjs(deal.shipments[0].expectedDeliveryDate).format('DD.MM.YYYY')}
                </Descriptions.Item>
            )}
          </>
        )}
        
        <Descriptions.Item label="Адрес доставки">
            {deal.deliveryAddress ? (
                <div className="text-xs">
                    {deal.deliveryAddress.city}, {deal.deliveryAddress.street}, {deal.deliveryAddress.house}
                </div>
            ) : <span className="text-gray-400 italic">Не указан</span>}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

// Доп. импорт для Space, который забыли
import { Space } from 'antd';