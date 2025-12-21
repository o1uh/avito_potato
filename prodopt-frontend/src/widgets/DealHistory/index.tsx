import { Timeline, Typography } from 'antd';
import { Deal, Transaction } from '@/entities/deal/model/types'; // Исправлен путь
import dayjs from 'dayjs';

interface Props {
  deal: Deal;
}

export const DealHistory = ({ deal }: Props) => {
  const transactions = deal.transactions || [];
  
  const items = transactions.map((tx: Transaction) => ({ // Явная типизация tx
      color: tx.transactionStatusId === 2 ? 'green' : 'red', 
      children: (
          <div>
              <div className="font-medium">Транзакция #{tx.id}</div>
              <div className="text-xs text-gray-500">{dayjs(tx.createdAt).format('DD.MM.YYYY HH:mm')}</div>
              <div>Сумма: {Number(tx.amount).toLocaleString()} ₽</div>
              <div>Тип: {tx.transactionTypeId === 1 ? 'Пополнение' : 'Выплата'}</div>
          </div>
      )
  }));

  items.push({
      color: 'blue',
      children: (
          <div>
              <div className="font-medium">Сделка создана</div>
              <div className="text-xs text-gray-500">{dayjs(deal.createdAt).format('DD.MM.YYYY HH:mm')}</div>
          </div>
      )
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <Typography.Title level={5}>История событий</Typography.Title>
      <div className="max-h-[300px] overflow-y-auto mt-4">
        <Timeline items={items} />
      </div>
    </div>
  );
};