import { Button, Popconfirm, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dealApi } from '@/entities/deal/api/deal.api';

interface Props {
  dealId: number;
}

export const ConfirmDeliveryBtn = ({ dealId }: Props) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => dealApi.confirmDelivery(dealId),
    onSuccess: () => {
      message.success('Сделка завершена! Деньги переведены поставщику.');
      queryClient.invalidateQueries({ queryKey: ['deal', String(dealId)] });
    },
    onError: () => message.error('Ошибка подтверждения')
  });

  return (
    <Popconfirm
      title="Подтвердить приемку?"
      description="Нажимая 'Да', вы подтверждаете качество товара. Деньги будут переведены поставщику безвозвратно."
      onConfirm={() => mutation.mutate()}
      okText="Да, товар принят"
      cancelText="Отмена"
    >
      <Button type="primary" size="large" icon={<CheckOutlined />} loading={mutation.isPending} className="bg-green-600 hover:bg-green-500">
        Товар получен, претензий нет
      </Button>
    </Popconfirm>
  );
};