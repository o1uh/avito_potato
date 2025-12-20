import { Form, Input, Button, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { referencesApi } from '@/shared/api/references.api';

interface Props {
  onFinish: (values: any) => void;
  initialValues?: any;
}

export const MainStep = ({ onFinish, initialValues }: Props) => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: referencesApi.getCategories,
  });

  return (
    <Form
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      className="max-w-lg mx-auto"
    >
      <Form.Item
        label="Название товара"
        name="name"
        rules={[{ required: true, message: 'Введите название' }]}
      >
        <Input placeholder="Например, Молоко 'Домик в деревне'" size="large" />
      </Form.Item>

      <Form.Item
        label="Категория"
        name="productCategoryId"
        rules={[{ required: true, message: 'Выберите категорию' }]}
      >
        <Select
          loading={isLoading}
          placeholder="Выберите категорию"
          options={categories?.data?.map((c) => ({ label: c.name, value: c.id }))}
          showSearch
          optionFilterProp="label"
          size="large"
        />
      </Form.Item>

      <Form.Item
        label="Описание"
        name="description"
        rules={[{ required: true, message: 'Добавьте описание' }]}
      >
        <Input.TextArea rows={4} placeholder="Состав, условия хранения, особенности..." />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block size="large">
          Далее: Варианты фасовки
        </Button>
      </Form.Item>
    </Form>
  );
};