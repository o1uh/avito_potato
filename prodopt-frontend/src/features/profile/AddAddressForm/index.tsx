import { Form, Modal, message } from 'antd';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select'; 
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
      message.success('Адрес успешно добавлен');
      setIsModalOpen(false);
      form.resetFields();
      // Обновляем данные компании, чтобы увидеть новый адрес
      queryClient.invalidateQueries({ queryKey: ['myCompany'] });
    },
    onError: (error: any) => {
      console.error(error);
      message.error('Ошибка при сохранении адреса');
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
        <Form 
            form={form} 
            layout="vertical" 
            onFinish={onFinish} 
            initialValues={{ country: 'Россия', addressTypeId: 3 }} // Default: Склад
        >
          <Form.Item label="Тип адреса" name="addressTypeId" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 2, label: 'Фактический' },
                { value: 3, label: 'Почтовый' },
                { value: 4, label: 'Склад' },
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
            <Form.Item label="Город" name="city" rules={[{ required: true, message: 'Укажите город' }]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item label="Улица" name="street" rules={[{ required: true, message: 'Укажите улицу' }]}>
            <Input />
          </Form.Item>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item label="Дом" name="house" rules={[{ required: true, message: 'Номер дома' }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Строение" name="building">
              <Input />
            </Form.Item>
            <Form.Item label="Офис/Кв" name="apartment">
              <Input />
            </Form.Item>
          </div>
          
          <Form.Item label="Индекс" name="postalCode">
              <Input />
          </Form.Item>

          <Form.Item label="Комментарий" name="comment">
            <Input.TextArea rows={2} placeholder="Часы работы, как проехать..." />
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