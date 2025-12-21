import { useState } from 'react';
import { Table, Button, Image, Space, Modal, message, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/entities/admin/api/admin.api';
import { ModerationQueueItem } from '@/entities/admin/model/types';
import dayjs from 'dayjs';
import { formatCurrency } from '@/shared/lib/currency';

const { Text } = Typography;

export const ModerationList = () => {
  const queryClient = useQueryClient();
  const [previewProduct, setPreviewProduct] = useState<ModerationQueueItem | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-moderation'],
    queryFn: adminApi.getModerationQueue,
  });

  const approveMutation = useMutation({
    mutationFn: adminApi.approveProduct,
    onSuccess: () => {
      message.success('Товар одобрен');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
      setPreviewProduct(null);
    },
    onError: () => message.error('Ошибка одобрения'),
  });

  const rejectMutation = useMutation({
    mutationFn: adminApi.rejectProduct, // Предполагаем наличие метода, либо реализуем через update
    onSuccess: () => {
      message.success('Товар отклонен (возвращен в черновики)');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
      setPreviewProduct(null);
    },
    onError: () => message.error('Ошибка отклонения'),
  });

  const columns = [
    {
      title: 'Фото',
      key: 'image',
      render: (_: any, record: ModerationQueueItem) => {
        const img = record.images?.find(i => i.isMain)?.imageUrl || record.images?.[0]?.imageUrl;
        return img ? <Image src={img} width={50} height={50} className="object-cover rounded" /> : <div className="w-[50px] h-[50px] bg-gray-100 rounded flex items-center justify-center text-xs">Нет</div>;
      }
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ModerationQueueItem) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.supplier?.name}</div>
        </div>
      )
    },
    {
      title: 'Категория',
      dataIndex: ['category', 'name'],
      key: 'category',
    },
    {
      title: 'Дата',
      dataIndex: 'updatedAt',
      key: 'date',
      render: (d: string) => dayjs(d).format('DD.MM.YYYY'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: ModerationQueueItem) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewProduct(record)} />
          <Button 
            type="primary" 
            icon={<CheckOutlined />} 
            className="bg-green-600" 
            onClick={() => approveMutation.mutate(record.id)}
            loading={approveMutation.isPending}
          />
          <Button 
            danger 
            icon={<CloseOutlined />} 
            onClick={() => rejectMutation.mutate(record.id)}
            loading={rejectMutation.isPending}
          />
        </Space>
      )
    }
  ];

  return (
    <>
      <Table 
        dataSource={products} 
        columns={columns} 
        rowKey="id" 
        loading={isLoading}
        pagination={{ pageSize: 5 }}
        locale={{ emptyText: 'Нет товаров на модерации' }}
      />

      <Modal
        title="Просмотр товара"
        open={!!previewProduct}
        onCancel={() => setPreviewProduct(null)}
        footer={[
          <Button key="reject" danger onClick={() => rejectMutation.mutate(previewProduct!.id)}>
            Отклонить
          </Button>,
          <Button key="approve" type="primary" onClick={() => approveMutation.mutate(previewProduct!.id)}>
            Одобрить
          </Button>,
        ]}
      >
        {previewProduct && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
               {previewProduct.images?.map(img => (
                   <Image key={img.id} src={img.imageUrl} width={100} className="rounded border" />
               ))}
            </div>
            
            <div>
                <Text type="secondary">Описание:</Text>
                <div className="bg-gray-50 p-3 rounded mt-1 border">{previewProduct.description}</div>
            </div>

            <div>
                <Text type="secondary">Варианты фасовки:</Text>
                <div className="mt-1 space-y-1">
                    {previewProduct.variants?.map(v => (
                        <div key={v.id} className="flex justify-between border-b border-dashed pb-1">
                            <span>{v.variantName} <span className="text-xs text-gray-400">({v.sku})</span></span>
                            <span className="font-medium">{formatCurrency(v.price)}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};