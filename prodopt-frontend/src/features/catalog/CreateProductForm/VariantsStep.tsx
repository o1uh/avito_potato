import { Form, Input, Button, InputNumber, Select, Card } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { referencesApi } from '@/shared/api/references.api';

interface Props {
  onFinish: (values: any) => void;
  onBack: () => void;
  isLoading: boolean;
}

export const VariantsStep = ({ onFinish, onBack, isLoading }: Props) => {
  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: referencesApi.getUnits,
  });

  return (
    <Form layout="vertical" onFinish={onFinish} autoComplete="off">
      <div className="mb-4 text-gray-500">
        Добавьте хотя бы один вариант товара (например, "Коробка 10кг" или "Бутылка 1л").
      </div>

      <Form.List 
        name="variants"
        initialValue={[{}]} // По умолчанию показываем одну пустую форму
      >
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Card 
                key={key} 
                size="small" 
                className="mb-4 bg-gray-50 border-gray-200"
                title={`Вариант #${name + 1}`}
                extra={fields.length > 1 ? (
                  <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500 cursor-pointer" />
                ) : null}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    {...restField}
                    name={[name, 'variantName']}
                    label="Название фасовки"
                    rules={[{ required: true, message: 'Обязательно' }]}
                  >
                    <Input placeholder="Например: Мешок 50кг" />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'sku']}
                    label="Артикул (SKU)"
                    rules={[{ required: true, message: 'Обязательно' }]}
                  >
                    <Input placeholder="ART-001" />
                  </Form.Item>

                  <div className="flex gap-2">
                    <Form.Item
                      {...restField}
                      name={[name, 'price']}
                      label="Цена (₽)"
                      className="flex-1"
                      rules={[{ required: true, message: 'Укажите цену' }]}
                    >
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    
                    <Form.Item
                      {...restField}
                      name={[name, 'measurementUnitId']}
                      label="Ед. изм."
                      className="w-[120px]"
                      rules={[{ required: true, message: 'Выбрать' }]}
                    >
                      <Select
                        placeholder="Ед."
                        options={units?.data?.map((u) => ({ label: u.name, value: u.id }))}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    {...restField}
                    name={[name, 'minOrderQuantity']}
                    label="Мин. заказ"
                    initialValue={1}
                    rules={[{ required: true, message: 'Минимум 1' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              </Card>
            ))}
            
            <Form.Item>
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                Добавить вариант
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>

      <div className="flex justify-between mt-6">
        <Button onClick={onBack} size="large">Назад</Button>
        <Button type="primary" htmlType="submit" size="large" loading={isLoading}>
          Создать товар
        </Button>
      </div>
    </Form>
  );
};