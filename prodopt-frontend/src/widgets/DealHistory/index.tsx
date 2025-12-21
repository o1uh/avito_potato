import { Timeline, Typography } from 'antd';
import { Deal, Transaction } from '@/entities/deal/model/types';
import dayjs from 'dayjs';

interface Props {
  deal: Deal;
}

export const DealHistory = ({ deal }: Props) => {
  const transactions = deal.transactions || [];
  
  // Делаем копию и сортируем по ID (по возрастанию), 
  // чтобы получить строгую хронологию: [Старые ... Новые]
  const sortedTransactions = [...transactions].sort((a, b) => a.id - b.id);

  // Формируем элементы таймлайна сверху вниз
  const items = [
    {
      color: 'blue',
      children: (
          <div className="pb-2">
              <div className="font-medium">Сделка создана</div>
              <div className="text-xs text-gray-500">{dayjs(deal.createdAt).format('DD.MM.YYYY HH:mm')}</div>
          </div>
      )
    }
  ];

  // Добавляем транзакции (идут после создания)
  sortedTransactions.forEach((tx: Transaction) => {
      const isDeposit = tx.transactionTypeId === 1;
      const isRelease = tx.transactionTypeId === 2;
      const isRefund = tx.transactionTypeId === 3;

      let typeText = 'Транзакция';
      if (isDeposit) typeText = 'Пополнение Эскроу';
      if (isRelease) typeText = 'Выплата продавцу';
      if (isRefund) typeText = 'Возврат средств';

      items.push({
          color: tx.transactionStatusId === 2 ? 'green' : 'red', 
          children: (
              <div className="pb-2">
                  <div className="font-medium">{typeText}</div>
                  <div className="text-xs text-gray-500">{dayjs(tx.createdAt).format('DD.MM.YYYY HH:mm')}</div>
                  <div>Сумма: {Number(tx.amount).toLocaleString()} ₽</div>
              </div>
          )
      });
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-6">
      <Typography.Title level={5} className="mb-4">История событий</Typography.Title>
      
      {/* 
         Добавили pt-4 (отступ сверху), чтобы верхний маркер не обрезался.
         Добавили pl-2 (отступ слева) для выравнивания.
      */}
      <div className="max-h-[300px] overflow-y-auto pt-4 pl-2">
        <Timeline items={items} />
      </div>
    </div>
  );
};