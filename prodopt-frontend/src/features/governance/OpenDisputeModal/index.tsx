import { Modal, Form, Input, Button, message, Alert } from 'antd'; // убрал useState
import { WarningOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { governanceApi } from '@/entities/governance/api/governance.api';

interface Props {
  dealId: number;
  isOpen: boolean;
  onCancel: () => void;
}

export const OpenDisputeModal = ({ dealId, isOpen, onCancel }: Props) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: any) => governanceApi.openDispute(dealId, values),
    onSuccess: () => {
      message.success('Спор открыт. Средства на счете заморожены.');
      form.resetFields();
      onCancel();
      queryClient.invalidateQueries({ queryKey: ['deal', String(dealId)] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Ошибка при открытии спора');
    }
  });

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-red-600">
          <WarningOutlined /> Открытие спора (Арбитраж)
        </div>
      }
      open={isOpen}
      onCancel={onCancel}
      footer={null}
    >
      <Alert 
        type="warning" 
        message="Внимание!" 
        description="Открытие спора заморозит средства на Эскроу-счете. К решению подключится администратор платформы."
        className="mb-4"
        showIcon
      />

      <Form layout="vertical" form={form} onFinish={mutation.mutate}>
        <Form.Item
          name="reason"
          label="Причина спора"
          rules={[{ required: true, message: 'Укажите причину' }]}
        >
          <Input placeholder="Например: Товар не соответствует описанию" />
        </Form.Item>

        <Form.Item
          name="demands"
          label="Ваши требования"
          rules={[{ required: true, message: 'Опишите требования' }]}
        >
          <Input.TextArea 
            rows={4} 
            placeholder="Например: Полный возврат средств, так как товар испорчен." 
          />
        </Form.Item>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onCancel}>Отмена</Button>
          <Button type="primary" danger htmlType="submit" loading={mutation.isPending}>
            Открыть спор
          </Button>
        </div>
      </Form>
    </Modal>
  );
};