import { Drawer, Form, InputNumber, DatePicker, Button, Table, Typography, message, Alert, Input } from 'antd'; // Добавлен Input
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { offerApi } from '@/entities/deal/api/offer.api';
import { PurchaseRequest, CommercialOffer } from '@/entities/deal/model/types';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  rfq?: PurchaseRequest;
  existingOffer?: CommercialOffer;
  readOnly?: boolean;
}

export const CreateOfferForm = ({ open, onClose, rfq, existingOffer, readOnly }: Props) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      if (existingOffer) {
        form.setFieldsValue({
          offerPrice: existingOffer.offerPrice,
          deliveryConditions: existingOffer.deliveryConditions,
          expiresOn: dayjs(existingOffer.expiresOn),
        });
        setItems(existingOffer.items.map(i => ({
            key: i.id || i.productVariantId,
            id: i.productVariantId,
            name: i.productVariant?.product?.name || 'Товар',
            variant: i.productVariant?.variantName || 'Вариант',
            quantity: i.quantity,
            price: i.pricePerUnit
        })));
      } else if (rfq) {
        form.setFieldsValue({
          deliveryConditions: 'Самовывоз (EXW)',
          expiresOn: dayjs().add(7, 'day'),
        });
        
        if (rfq.targetVariant) {
            const variant = rfq.targetVariant;
            const qty = rfq.requestedQuantity || 1;
            const price = Number(variant.price);
            
            setItems([{
                key: variant.id,
                id: variant.id,
                name: variant.product?.name,
                variant: variant.variantName,
                quantity: qty,
                price: price
            }]);
            form.setFieldValue('offerPrice', price * qty);
        }
      }
    }
  }, [open, rfq, existingOffer, form]);

  const createMutation = useMutation({
    mutationFn: offerApi.create,
    onSuccess: () => {
      message.success('КП отправлено!');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['offers-list'] });
    },
    onError: () => message.error('Ошибка отправки КП'),
  });

  const negotiateMutation = useMutation({
    mutationFn: (values: any) => offerApi.negotiate(existingOffer!.id, values),
    onSuccess: () => {
      message.success('Условия обновлены');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['offers-list'] });
    },
    onError: () => message.error('Ошибка обновления'),
  });

  const onFinish = (values: any) => {
    if (existingOffer) {
      negotiateMutation.mutate({
        offerPrice: values.offerPrice,
        deliveryConditions: values.deliveryConditions,
      });
    } else {
      createMutation.mutate({
        requestId: rfq!.id,
        offerPrice: values.offerPrice,
        deliveryConditions: values.deliveryConditions,
        expiresOn: values.expiresOn.toISOString(),
        items: items.map(i => ({
            productVariantId: i.id,
            quantity: i.quantity,
            pricePerUnit: i.price
        }))
      });
    }
  };

  const handleItemChange = (key: number, field: string, value: number) => {
      const newItems = items.map(item => {
          if (item.key === key) {
              const updated = { ...item, [field]: value };
              return updated;
          }
          return item;
      });
      setItems(newItems);
      const total = newItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
      form.setFieldValue('offerPrice', total);
  };

  const columns = [
      { title: 'Товар', dataIndex: 'name', key: 'name' },
      { title: 'Вариант', dataIndex: 'variant', key: 'variant' },
      { 
          title: 'Кол-во', 
          dataIndex: 'quantity', 
          key: 'quantity',
          render: (val: number, record: any) => readOnly || existingOffer ? val : (
              <InputNumber min={1} value={val} onChange={v => handleItemChange(record.key, 'quantity', v || 1)} />
          )
      },
      { 
          title: 'Цена за ед.', 
          dataIndex: 'price', 
          key: 'price',
          render: (val: number, record: any) => readOnly || existingOffer ? val : (
              <InputNumber min={0} value={val} onChange={v => handleItemChange(record.key, 'price', v || 0)} />
          )
      },
      {
          title: 'Сумма',
          key: 'total',
          render: (_: any, r: any) => (r.quantity * r.price).toLocaleString()
      }
  ];

  return (
    <Drawer
      title={existingOffer ? `КП #${existingOffer.id}` : "Новое коммерческое предложение"}
      width={720}
      onClose={onClose}
      open={open}
      extra={
        !readOnly && (
          <Button type="primary" onClick={() => form.submit()} loading={createMutation.isPending || negotiateMutation.isPending}>
            {existingOffer ? 'Сохранить изменения' : 'Отправить КП'}
          </Button>
        )
      }
    >
      {rfq && (
          <div className="mb-6 p-4 bg-gray-50 rounded">
              <Typography.Text strong>Запрос от {rfq.buyer?.name}:</Typography.Text>
              <div className="text-gray-600 mt-1">{rfq.comment}</div>
          </div>
      )}

      {readOnly && (
          <Alert 
            type="info" 
            showIcon
            message="Действия покупателя"
            description="Если условия вас не устраивают, свяжитесь с поставщиком через чат или отклоните предложение."
            action={<Button size="small" danger onClick={onClose}>Закрыть</Button>}
            className="mb-6"
          />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Typography.Title level={5}>1. Товары и Цены</Typography.Title>
        <Table 
            dataSource={items} 
            columns={columns} 
            pagination={false} 
            className="mb-6"
            summary={(pageData) => {
                let total = 0;
                pageData.forEach(({ quantity, price }) => total += quantity * price);
                return (
                    <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4} className="text-right font-bold">Итого:</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} className="font-bold">{total.toLocaleString()} ₽</Table.Summary.Cell>
                    </Table.Summary.Row>
                );
            }}
        />

        <Typography.Title level={5}>2. Общие условия</Typography.Title>
        <div className="grid grid-cols-2 gap-4">
            <Form.Item name="offerPrice" label="Итоговая сумма сделки (₽)" rules={[{ required: true }]} help="Может отличаться от суммы товаров">
                <InputNumber style={{ width: '100%' }} min={0} disabled={readOnly} />
            </Form.Item>
            <Form.Item name="expiresOn" label="Действительно до" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} disabled={readOnly} />
            </Form.Item>
        </div>
        <Form.Item name="deliveryConditions" label="Условия доставки и оплаты" rules={[{ required: true }]}>
            <Input.TextArea rows={4} disabled={readOnly} placeholder="Например: Самовывоз со склада, предоплата 100% через платформу." />
        </Form.Item>
      </Form>
    </Drawer>
  );
};