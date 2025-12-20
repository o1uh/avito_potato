import { useEffect } from 'react';
import { Input, Select, InputNumber, Button, Form, Card } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { referencesApi } from '@/shared/api/references.api';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';

export const ProductFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm();

  // Загрузка категорий для селекта
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: referencesApi.getCategories,
    staleTime: 1000 * 60 * 60, // 1 час
  });

  // Инициализация формы из URL при загрузке
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

    form.setFieldsValue({
      q,
      categoryId,
      minPrice,
      maxPrice
    });
  }, [searchParams, form]);

  const handleFinish = (values: any) => {
    const params: any = {};
    
    // Формируем новые параметры, отбрасывая пустые
    if (values.q) params.q = values.q;
    if (values.categoryId) params.categoryId = String(values.categoryId);
    if (values.minPrice) params.minPrice = String(values.minPrice);
    if (values.maxPrice) params.maxPrice = String(values.maxPrice);
    
    // Сбрасываем пагинацию при новом поиске
    params.offset = '0';

    setSearchParams(params);
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
  };

  return (
    <Card title="Фильтры" className="shadow-sm">
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        
        <Form.Item name="q" label="Поиск">
          <Input placeholder="Название, SKU..." prefix={<SearchOutlined className="text-gray-400"/>} allowClear />
        </Form.Item>

        <Form.Item name="categoryId" label="Категория">
          <Select
            placeholder="Все категории"
            allowClear
            // Исправление: обращаемся к .data, так как API возвращает ApiResponse<T>
            options={categories?.data?.map((c) => ({ label: c.name, value: c.id }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item label="Цена (₽)" className="mb-0">
          <div className="flex gap-2 items-baseline">
            <Form.Item name="minPrice" className="mb-4 flex-1">
              <InputNumber placeholder="От" style={{ width: '100%' }} min={0} />
            </Form.Item>
            <span className="text-gray-400">-</span>
            <Form.Item name="maxPrice" className="mb-4 flex-1">
              <InputNumber placeholder="До" style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>
        </Form.Item>

        <div className="flex flex-col gap-2 mt-2">
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            Найти
          </Button>
          <Button type="text" onClick={handleReset} icon={<ClearOutlined />} className="text-gray-500">
            Сбросить
          </Button>
        </div>
      </Form>
    </Card>
  );
};