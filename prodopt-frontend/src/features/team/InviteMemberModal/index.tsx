import { Form, Modal, message, Alert } from 'antd';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '@/entities/user/api/company.api';
import { CopyOutlined } from '@ant-design/icons';

export const InviteMemberModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: companyApi.inviteMember,
    onSuccess: (data) => {
      message.success('Сотрудник приглашен');
      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
      } else {
        closeModal();
      }
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Ошибка при приглашении');
    },
  });

  const onFinish = (values: any) => {
    mutation.mutate(values);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTempPassword(null);
    form.resetFields();
  };

  return (
    <>
      <Button type="primary" onClick={() => setIsModalOpen(true)}>Пригласить сотрудника</Button>
      
      <Modal
        title="Приглашение в команду"
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
      >
        {!tempPassword ? (
          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ roleId: 2 }}>
            <Form.Item label="ФИО" name="fullName" rules={[{ required: true }]}>
              <Input placeholder="Петров Петр" />
            </Form.Item>
            
            <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="employee@corp.com" />
            </Form.Item>

            <Form.Item label="Роль" name="roleId" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 1, label: 'Администратор (Полный доступ)' },
                  { value: 2, label: 'Менеджер (Торговля)' },
                ]}
              />
            </Form.Item>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={closeModal}>Отмена</Button>
              <Button type="primary" htmlType="submit" loading={mutation.isPending}>
                Отправить приглашение
              </Button>
            </div>
          </Form>
        ) : (
          <div className="flex flex-col gap-4">
            <Alert
              message="Сотрудник успешно создан"
              description="Передайте сотруднику временный пароль для первого входа."
              type="success"
              showIcon
            />
            <div className="p-4 bg-gray-50 border rounded flex justify-between items-center">
              <span className="font-mono text-lg font-bold select-all">{tempPassword}</span>
              <Button 
                type="text" 
                icon={<CopyOutlined />} 
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  message.success('Скопировано');
                }}
              />
            </div>
            <Button type="primary" onClick={closeModal} block>Готово</Button>
          </div>
        )}
      </Modal>
    </>
  );
};