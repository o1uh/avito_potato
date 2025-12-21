import { useState } from 'react';
import { Button, Modal, InputNumber, message } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dealApi } from '@/entities/deal/api/deal.api';
import { ENV } from '@/shared/config/env';
import { Deal } from '@/entities/deal/model/types';
import { browser } from '@/shared/lib/browser'; // <--- ДОБАВЛЕН ИМПОРТ

interface Props {
  deal: Deal;
}

export const PayDealButton = ({ deal }: Props) => {
  const queryClient = useQueryClient();
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);

  const total = Number(deal.totalAmount);
  const deposited = Number(deal.escrowAccount?.amountDeposited || 0);
  const remaining = total - deposited;

  const handlePayClick = () => {
    if (ENV.DEV) {
      setAmount(remaining);
      setIsDevModalOpen(true);
    } else {
      dealApi.payProd(deal.id)
        .then((res) => {
            // Используем browser вместо window.location
            if (res.paymentUrl) browser.location.assign(res.paymentUrl);
            else message.warning('Ссылка на оплату не получена');
        })
        .catch(() => message.error('Ошибка инициализации оплаты'));
    }
  };

  const devPayMutation = useMutation({
    mutationFn: () => dealApi.payDev(deal.id, amount || 0),
    onSuccess: () => {
      message.success('Оплата эмулирована успешно');
      setIsDevModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deal', String(deal.id)] });
    },
    onError: () => message.error('Ошибка оплаты')
  });

  if (remaining <= 0) return null;

  return (
    <>
      <Button type="primary" size="large" icon={<CreditCardOutlined />} onClick={handlePayClick}>
        Оплатить {remaining.toLocaleString()} ₽
      </Button>

      <Modal
        title="[DEV] Эмуляция оплаты"
        open={isDevModalOpen}
        onCancel={() => setIsDevModalOpen(false)}
        onOk={() => devPayMutation.mutate()}
        confirmLoading={devPayMutation.isPending}
        okText="Внести средства"
      >
        <div className="mb-4">
            <p>В режиме разработки вы можете внести произвольную сумму.</p>
            <p>Для перехода в статус PAID нужно внести: <b>{remaining}</b></p>
        </div>
        <InputNumber 
            style={{ width: '100%' }} 
            value={amount} 
            onChange={setAmount}
            prefix="₽"
        />
      </Modal>
    </>
  );
};