import { Form, Modal, message } from 'antd';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from 'antd';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '@/entities/user/api/company.api';

export const AddBankAccountForm = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: companyApi.addBankAccount,
    onSuccess: () => {
      message.success('Счет успешно добавлен');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['myCompany'] });
    },
    onError: () => {
      message.error('Ошибка при добавлении счета');
    },
  });

  const onFinish = (values: any) => {
    // Исправлено: убрали лишние поля id и дубликат bik
    mutation.mutate({
      bankBik: values.bankBik,
      bankName: values.bankName,
      checkingAccount: values.checkingAccount,
      correspondentAccount: values.correspondentAccount,
      isPrimary: values.isPrimary || false,
      bik: values.bankBik // Добавляем, чтобы соответствовать интерфейсу BankAccount (без id)
    });
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Добавить счет</Button>
      
      <Modal
        title="Добавление банковского счета"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="БИК Банка"
            name="bankBik"
            rules={[
              { required: true, message: 'Введите БИК' },
              { len: 9, message: 'БИК должен содержать 9 цифр' },
              { pattern: /^\d+$/, message: 'Только цифры' }
            ]}
          >
            <Input placeholder="044525225" />
          </Form.Item>

          <Form.Item
            label="Название Банка"
            name="bankName"
            rules={[{ required: true, message: 'Введите название банка' }]}
          >
            <Input placeholder="ПАО Сбербанк" />
          </Form.Item>

          <Form.Item
            label="Расчетный счет"
            name="checkingAccount"
            rules={[
              { required: true, message: 'Введите расчетный счет' },
              { len: 20, message: 'Счет должен содержать 20 цифр' },
              { pattern: /^\d+$/, message: 'Только цифры' }
            ]}
          >
            <Input placeholder="40702..." />
          </Form.Item>

          <Form.Item
            label="Корреспондентский счет"
            name="correspondentAccount"
            rules={[
              { required: true, message: 'Введите корр. счет' },
              { len: 20, message: 'Счет должен содержать 20 цифр' },
              { pattern: /^\d+$/, message: 'Только цифры' }
            ]}
          >
            <Input placeholder="30101..." />
          </Form.Item>

          <Form.Item name="isPrimary" valuePropName="checked">
            <Checkbox>Сделать основным</Checkbox>
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Сохранить
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};