import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Row, Col, Typography, Card, Tag, 
  Radio, Button, Image, Descriptions, 
  Divider, Spin, Alert 
} from 'antd';
import { ShopOutlined, ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { productApi } from '@/entities/product/api/product.api';
import { formatCurrency } from '@/shared/lib/currency';
import { useState } from 'react';
import { PartnerRequestBtn } from '@/features/networking/PartnerRequestBtn';

const { Title, Text, Paragraph } = Typography;

export const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getOne(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Spin size="large" /></div>;
  if (isError || !product) return <div className="p-10"><Alert type="error" message="Товар не найден" /></div>;

  // Находим выбранный вариант
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0];
  
  // Устанавливаем дефолтный вариант при первой загрузке
  if (!selectedVariantId && product.variants.length > 0) {
    setSelectedVariantId(product.variants[0].id);
  }

  // Главное изображение
  const mainImage = product.images.find(i => i.isMain)?.imageUrl || product.images[0]?.imageUrl;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(-1)} 
        className="mb-4"
      >
        Назад в каталог
      </Button>

      <Row gutter={[32, 32]}>
        {/* ЛЕВАЯ КОЛОНКА: ГАЛЕРЕЯ */}
        <Col xs={24} md={10} lg={8}>
          <div className="border rounded-lg overflow-hidden bg-white mb-4">
            <Image 
              src={mainImage} 
              alt={product.name} 
              width="100%" 
              className="object-contain max-h-[400px]"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.map(img => (
              <Image 
                key={img.id}
                src={img.imageUrl}
                className="border rounded cursor-pointer hover:border-primary object-cover h-[80px]"
                preview={true}
              />
            ))}
          </div>
        </Col>

        {/* ПРАВАЯ КОЛОНКА: ИНФОРМАЦИЯ */}
        <Col xs={24} md={14} lg={16}>
          <div className="flex flex-col h-full">
            <div>
              <Tag color="blue" className="mb-2">{product.category?.name}</Tag>
              <Title level={2} className="!mt-0">{product.name}</Title>
              
              <div className="flex items-center gap-2 mb-6">
                <ShopOutlined className="text-gray-400" />
                <Text type="secondary">Поставщик:</Text>
                <LinkToSupplier id={product.supplierCompanyId} name={product.supplier?.name} />
              </div>

              <Card className="bg-gray-50 border-gray-200 mb-6">
                <div className="mb-4">
                  <Text type="secondary" className="block mb-2">Варианты фасовки:</Text>
                  <Radio.Group 
                    value={selectedVariantId} 
                    onChange={e => setSelectedVariantId(e.target.value)}
                    buttonStyle="solid"
                  >
                    {product.variants.map(v => (
                      <Radio.Button key={v.id} value={v.id}>
                        {v.variantName}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>

                <div className="flex items-end gap-4 mb-4">
                  <Title level={3} className="!m-0 text-primary">
                    {formatCurrency(selectedVariant?.price || 0)}
                  </Title>
                  <Text type="secondary" className="pb-1">
                    за {selectedVariant?.measurementUnit?.name || 'ед.'}
                  </Text>
                </div>

                <div className="flex gap-3">
                  {/* Кнопка создания запроса (будет реализована на Этапе 8) */}
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<ShoppingCartOutlined />}
                    disabled // Временно, пока нет функционала RFQ
                  >
                    Запросить КП
                  </Button>
                  
                  {/* Кнопка партнерства */}
                  <PartnerRequestBtn 
                    status="NONE" // Здесь нужно проверять реальный статус (TODO)
                    targetCompanyId={product.supplierCompanyId}
                    companyName={product.supplier?.name}
                  />
                </div>
              </Card>

              <Divider />

              <Title level={4}>Описание</Title>
              <Paragraph className="text-gray-600 whitespace-pre-wrap">
                {product.description || 'Описание отсутствует'}
              </Paragraph>
            </div>

            <div className="mt-auto pt-6">
              <Descriptions title="Характеристики" size="small" bordered column={1}>
                <Descriptions.Item label="Артикул (SKU)">
                  {selectedVariant?.sku || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Мин. партия">
                  {selectedVariant?.minOrderQuantity} {selectedVariant?.measurementUnit?.name}
                </Descriptions.Item>
                <Descriptions.Item label="Остаток">
                  {selectedVariant?.stockQuantity ? `${selectedVariant.stockQuantity}` : 'Под заказ'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

// Вспомогательный компонент для ссылки на поставщика
const LinkToSupplier = ({ id, name }: { id?: number; name?: string }) => {
  if (!id) return <Text>Неизвестный</Text>;
  return <Text strong>{name}</Text>; // Можно обернуть в Link, если будет страница компании
};