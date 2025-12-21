import { Modal, Form, Input, Select, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dealApi } from '@/entities/deal/api/deal.api';

interface Props {
  dealId: number;
  open: boolean;
  onCancel: () => void;
}

export const AddTrackingModal = ({ dealId, open, onCancel }: Props) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: any) => dealApi.addTracking(dealId, values.trackingNumber, values.carrier),
    onSuccess: () => {
      message.success('Трек-номер добавлен, груз отправлен');
      onCancel();
      queryClient.invalidateQueries({ queryKey: ['deal', String(dealId)] });
    },
    onError: () => message.error('Ошибка сохранения трек-номера')
  });

  return (
    <Modal
      title="Отгрузка товара"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={mutation.isPending}
      okText="Подтвердить отгрузку"
    >
      <Form form={form} layout="vertical" onFinish={mutation.mutate}>
        <Form.Item name="carrier" label="Служба доставки" initialValue="CDEK">
            <Select options={[{ value: 'CDEK', label: 'СДЭК' }, { value: 'Dellin', label: 'Деловые Линии' }, { value: 'Manual', label: 'Своя логистика' }]} />
        </Form.Item>
        <Form.Item 
            name="trackingNumber" 
            label="Трек-номер" 
            rules={[{ required: true, message: 'Введите номер накладной' }]}
        >
            <Input placeholder="Например: 1234567890" />
        </Form.Item>
      </Form>
    </Modal>
  );
};