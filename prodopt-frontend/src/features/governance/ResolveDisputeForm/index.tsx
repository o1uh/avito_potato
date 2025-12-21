import { Modal, Form, Input, InputNumber, Button, Radio, Descriptions, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { governanceApi } from '@/entities/governance/api/governance.api';
import { Dispute } from '@/entities/governance/model/types';
import { formatCurrency } from '@/shared/lib/currency';

interface Props {
  dispute: Dispute;
  open: boolean;
  onCancel: () => void;
}

export const ResolveDisputeForm = ({ dispute, open, onCancel }: Props) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: any) => governanceApi.resolveDispute(dispute.id, {
      decision: values.decision,
      refundAmount: values.refundAmount,
      winnerCompanyId: values.winnerCompanyId
    }),
    onSuccess: () => {
      message.success('Спор разрешен');
      onCancel();
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Ошибка');
    }
  });

  if (!dispute.deal) return null;

  const totalAmount = Number(dispute.deal.totalAmount);

  return (
    <Modal
      title={`Решение спора #${dispute.id}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Descriptions bordered column={1} size="small" className="mb-6">
        <Descriptions.Item label="Сумма сделки">{formatCurrency(totalAmount)}</Descriptions.Item>
        <Descriptions.Item label="Истец">{dispute.claimant?.name}</Descriptions.Item>
        <Descriptions.Item label="Ответчик">{dispute.defendant?.name}</Descriptions.Item>
        <Descriptions.Item label="Причина">{dispute.disputeReason}</Descriptions.Item>
        <Descriptions.Item label="Требования">{dispute.claimantDemands}</Descriptions.Item>
      </Descriptions>

      <Form layout="vertical" form={form} onFinish={mutation.mutate} initialValues={{ refundAmount: 0 }}>
        <Form.Item 
          name="winnerCompanyId" 
          label="В чью пользу решение?" 
          rules={[{ required: true, message: 'Выберите победителя' }]}
        >
          <Radio.Group className="flex flex-col gap-2">
            <Radio value={dispute.claimantCompanyId}>
              Истец ({dispute.claimant?.name}) - Возврат средств
            </Radio>
            <Radio value={dispute.defendantCompanyId}>
              Ответчик ({dispute.defendant?.name}) - Выплата продавцу
            </Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item 
          name="refundAmount" 
          label={`Сумма возврата Покупателю (Макс: ${totalAmount})`}
          rules={[{ required: true }]}
          extra="Если 0 - вся сумма уйдет Продавцу. Если равно сумме сделки - полный возврат."
        >
          <InputNumber 
            style={{ width: '100%' }} 
            min={0} 
            max={totalAmount}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            addonAfter="₽"
          />
        </Form.Item>

        <Form.Item 
          name="decision" 
          label="Обоснование решения" 
          rules={[{ required: true, message: 'Напишите обоснование' }]}
        >
          <Input.TextArea rows={4} placeholder="Текст решения арбитра..." />
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Отмена</Button>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Вынести решение
          </Button>
        </div>
      </Form>
    </Modal>
  );
};