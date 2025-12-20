import { Form, Modal, message } from 'antd';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select'; // Используем нашу обертку или Antd
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '@/entities/user/api/company.api';

export const AddAddressForm = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: companyApi.addAddress,
    onSuccess: () => {
      message.success('Адрес добавлен');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['myCompany'] });
    },
    onError: () => {
      // Покажем заглушку, т.к. на бэкенде в текущем контексте нет эндпоинта
      message.warning('Функционал добавления адресов в разработке (API 404)');
      setIsModalOpen(false);
    },
  });

  const onFinish = (values: any) => {
    mutation.mutate(values);
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Добавить адрес</Button>
      
      <Modal
        title="Новый адрес"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ country: 'Россия' }}>
          <Form.Item label="Тип адреса" name="addressTypeId" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 2, label: 'Фактический' },
                { value: 3, label: 'Склад' },
                { value: 4, label: 'Почтовый' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Страна" name="country" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="Регион/Область" name="region">
              <Input />
            </Form.Item>
            <Form.Item label="Город" name="city" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item label="Улица" name="street" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item label="Дом" name="house" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Строение" name="building">
              <Input />
            </Form.Item>
            <Form.Item label="Офис/Кв" name="apartment">
              <Input />
            </Form.Item>
          </div>

          <Form.Item label="Комментарий" name="comment">
            <Input.TextArea rows={2} />
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