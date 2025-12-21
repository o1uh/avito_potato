import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { rfqApi } from '@/entities/deal/api/rfq.api';
import { productApi } from '@/entities/product/api/product.api';
import { companyApi } from '@/entities/user/api/company.api';
import { useSessionStore } from '@/entities/session/model/store';
import { useState } from 'react';

interface Props {
  open: boolean;
  onCancel: () => void;
  partnerId?: number | null; // Если null — публичный запрос
  preselectedProductVariantId?: number; // Если открыли из карточки товара
}

export const CreateRfqModal = ({ open, onCancel, partnerId, preselectedProductVariantId }: Props) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);

  // 1. Поиск товаров (для селекта, если не предвыбран)
  const [searchText, setSearchText] = useState('');
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products-search', searchText],
    queryFn: () => productApi.search({ q: searchText, limit: 10 }),
    enabled: open && !preselectedProductVariantId, // Ищем только если модалка открыта и нет предвыбора
  });

  // 2. Адреса компании (для добавления в комментарий, т.к. в DTO нет поля addressId)
  const { data: company } = useQuery({
    queryKey: ['myCompany'],
    queryFn: companyApi.getMyCompany,
    enabled: open,
  });

  // Мутация создания
  const createMutation = useMutation({
    mutationFn: rfqApi.create,
    onSuccess: () => {
      message.success('Запрос на закупку создан');
      form.resetFields();
      onCancel();
      queryClient.invalidateQueries({ queryKey: ['rfq-list'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Ошибка создания запроса');
    },
  });

  const handleFinish = (values: any) => {
    // Формируем комментарий с адресом
    let finalComment = values.comment;
    if (values.addressId) {
        const address = company?.addresses?.find(a => a.address.id === values.addressId)?.address;
        if (address) {
            const addressStr = `${address.city}, ${address.street}, ${address.house}`;
            finalComment = `${values.comment}\n\nАдрес доставки: ${addressStr}`;
        }
    }

    createMutation.mutate({
      comment: finalComment,
      supplierCompanyId: partnerId || null,
      productVariantId: preselectedProductVariantId || values.productVariantId,
      quantity: values.quantity,
    });
  };

  // Подготовка опций для селекта товаров
  const productOptions = productsData?.items.flatMap(p => 
    p.variants.map(v => ({
      label: `${p.name} - ${v.variantName} (${v.price} ₽)`,
      value: v.id,
    }))
  ) || [];

  const addressOptions = company?.addresses?.map(a => ({
      label: `${a.addressType.name}: ${a.address.city}, ${a.address.street}`,
      value: a.address.id
  })) || [];

  return (
    <Modal
      title={partnerId ? "Приватный запрос партнеру" : "Публичный запрос на закупку"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={createMutation.isPending}
      okText="Создать запрос"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {/* Если товар не предвыбран, даем поиск */}
        {!preselectedProductVariantId && (
          <Form.Item 
            name="productVariantId" 
            label="Товар" 
            rules={[{ required: true, message: 'Выберите товар' }]}
          >
            <Select
              showSearch
              placeholder="Введите название товара"
              filterOption={false}
              onSearch={setSearchText}
              loading={isProductsLoading}
              options={productOptions}
              notFoundContent={searchText ? "Не найдено" : "Начните вводить..."}
            />
          </Form.Item>
        )}

        <Form.Item 
            name="quantity" 
            label="Требуемое количество" 
            rules={[{ required: true, message: 'Укажите количество' }]}
        >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="шт/кг" />
        </Form.Item>

        <Form.Item name="addressId" label="Адрес доставки">
            <Select 
                placeholder="Выберите адрес склада/офиса" 
                options={addressOptions}
                allowClear
            />
        </Form.Item>

        <Form.Item 
          name="comment" 
          label="Комментарий / Требования" 
          rules={[{ required: true, message: 'Опишите ваши требования' }]}
        >
          <Input.TextArea rows={4} placeholder="Сроки, упаковка, особенности..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};