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
import { useState, useEffect, useMemo } from 'react';
import { PartnerRequestBtn } from '@/features/networking/PartnerRequestBtn';
import { CreateRfqModal } from '@/features/trade/CreateRfqModal';

const { Title, Text, Paragraph } = Typography;

export const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getOne(id!),
    enabled: !!id,
  });

  // Логика фильтрации картинок
  const displayImages = useMemo(() => {
    if (!product) return [];

    // 1. Общие картинки (всегда показываем)
    const commonImages = product.images.filter(img => !img.variantId);

    // 2. Картинки конкретного варианта (если выбран)
    const variantImages = selectedVariantId 
        ? product.images.filter(img => img.variantId === selectedVariantId)
        : [];

    // ОБЪЕДИНЯЕМ: Сначала общие, потом специфичные
    return [...commonImages, ...variantImages];
  }, [product, selectedVariantId]);

  // Установка дефолтного варианта и картинки
  useEffect(() => {
    if (product && product.variants.length > 0) {
      if (!selectedVariantId) setSelectedVariantId(product.variants[0].id);
    }
  }, [product]);

  // Обновляем главное фото при смене списка картинок
  useEffect(() => {
    if (displayImages.length > 0) {
        // Пытаемся найти первую картинку ИМЕННО выбранного варианта
        const firstVariantImage = displayImages.find(img => img.variantId === selectedVariantId);
        
        if (firstVariantImage) {
            // Если у варианта есть свои фото - показываем их сразу
            setCurrentImage(firstVariantImage.imageUrl);
        } else {
            // Иначе показываем главную (isMain) или просто первую из общих
            const main = displayImages.find(i => i.isMain)?.imageUrl || displayImages[0].imageUrl;
            setCurrentImage(main);
        }
    } else {
        setCurrentImage('');
    }
  }, [displayImages, selectedVariantId]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Spin size="large" /></div>;
  if (isError || !product) return <div className="p-10"><Alert type="error" message="Товар не найден" /></div>;

  // Находим выбранный вариант
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0];
  
  // Устанавливаем дефолтный вариант при первой загрузке
  if (!selectedVariantId && product.variants.length > 0) {
    setSelectedVariantId(product.variants[0].id);
  }

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
          <div className="border rounded-lg overflow-hidden bg-white mb-4 flex items-center justify-center h-[400px]">
             {currentImage ? (
                <Image 
                  src={currentImage} 
                  alt={product.name} 
                  className="object-contain max-h-[400px]"
                />
             ) : (
                <div className="text-gray-300">Нет фото</div>
             )}
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {displayImages.map(img => (
              <div 
                key={img.id}
                onClick={() => setCurrentImage(img.imageUrl)}
                className={`
                  border rounded cursor-pointer h-[80px] overflow-hidden
                  ${currentImage === img.imageUrl ? 'border-primary border-2' : 'border-gray-200 hover:border-blue-300'}
                `}
              >
                <img 
                  src={img.imageUrl} 
                  className="w-full h-full object-cover" 
                  alt="thumbnail"
                />
              </div>
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
                    onChange={e => setSelectedVariantId(e.target.value)} // <--- Это триггерит обновление displayImages
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
                    onClick={() => setIsRfqModalOpen(true)}
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
      <CreateRfqModal
        open={isRfqModalOpen}
        onCancel={() => setIsRfqModalOpen(false)}
        partnerId={product.supplierCompanyId}
        preselectedProductVariantId={selectedVariantId || undefined}
      />
    </div>
  );
};

// Вспомогательный компонент для ссылки на поставщика
const LinkToSupplier = ({ id, name }: { id?: number; name?: string }) => {
  if (!id) return <Text>Неизвестный</Text>;
  return <Text strong>{name}</Text>; // Можно обернуть в Link, если будет страница компании
};