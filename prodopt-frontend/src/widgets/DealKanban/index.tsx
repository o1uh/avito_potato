import { Card, Tag, Spin, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { dealApi } from '@/entities/deal/api/deal.api';
import { DealStatus } from '@/shared/config/enums';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/currency';
import dayjs from 'dayjs';

const COLUMNS = [
  { title: 'Согласование', status: DealStatus.CREATED, color: 'blue' },
  { title: 'Оплата', status: DealStatus.AGREED, color: 'cyan' },
  { title: 'В работе', status: DealStatus.PAID, color: 'orange' },
  { title: 'Доставка', status: DealStatus.SHIPPED, color: 'purple' },
  { title: 'Завершено', status: DealStatus.COMPLETED, color: 'green' },
];

export const DealKanban = () => {
  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals-list'],
    queryFn: dealApi.getAll,
  });

  if (isLoading) return <div className="p-10 text-center"><Spin /></div>;
  if (!deals || deals.length === 0) return <Empty description="Нет активных сделок" />;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
      {COLUMNS.map((col) => {
        const colDeals = deals.filter(d => d.dealStatusId === col.status);
        
        return (
          <div key={col.status} className="min-w-[280px] w-[280px] flex flex-col bg-gray-100 rounded-lg p-3">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="font-semibold text-gray-700">{col.title}</span>
              <Tag color={col.color}>{colDeals.length}</Tag>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {colDeals.map(deal => (
                <Link to={ROUTES.DEAL_DETAILS(deal.id)} key={deal.id}>
                  <Card 
                    size="small" 
                    hoverable 
                    className="cursor-pointer shadow-sm border-0"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-xs text-gray-500">#{deal.id}</div>
                      <div className="text-xs text-gray-400">{dayjs(deal.createdAt).format('DD.MM')}</div>
                    </div>
                    <div className="font-bold text-base mb-1">
                      {formatCurrency(deal.totalAmount)}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {deal.supplier?.name}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};