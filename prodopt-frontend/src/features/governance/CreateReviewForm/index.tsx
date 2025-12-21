import { useState } from 'react';
import { Modal, Form, Input, Rate, Button, message, Typography } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { governanceApi } from '@/entities/governance/api/governance.api';
import { StarOutlined } from '@ant-design/icons';

interface Props {
  dealId: number;
}

export const CreateReviewForm = ({ dealId }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const mutation = useMutation({
    mutationFn: (values: any) => governanceApi.createReview(dealId, values),
    onSuccess: () => {
      message.success('Спасибо за отзыв!');
      setIsModalOpen(false);
      // Если бы мы отображали список отзывов, нужно было бы инвалидировать их кэш
      // queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Ошибка отправки отзыва');
    }
  });

  return (
    <>
      <Button icon={<StarOutlined />} onClick={() => setIsModalOpen(true)}>
        Оставить отзыв
      </Button>

      <Modal
        title="Отзыв о сделке"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Typography.Paragraph type="secondary" className="mb-4">
          Ваша оценка влияет на рейтинг компании-партнера.
        </Typography.Paragraph>

        <Form layout="vertical" form={form} onFinish={mutation.mutate}>
          <Form.Item 
            name="rating" 
            label="Оценка" 
            rules={[{ required: true, message: 'Поставьте оценку' }]}
          >
            <Rate />
          </Form.Item>

          <Form.Item 
            name="comment" 
            label="Комментарий"
            rules={[{ required: true, message: 'Напишите комментарий' }]}
          >
            <Input.TextArea rows={4} placeholder="Как прошла сделка? Качество товара, сроки..." />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)}>Отмена</Button>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Отправить
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};