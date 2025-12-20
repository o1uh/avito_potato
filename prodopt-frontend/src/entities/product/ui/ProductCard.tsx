import { Card, Tag, Typography } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { Product } from '../model/types';
import { formatCurrency } from '@/shared/lib/currency';
import { ROUTES } from '@/shared/config/routes';

const { Meta } = Card;
const { Text } = Typography;

interface Props {
  product: Product;
}

export const ProductCard = ({ product }: Props) => {
  // Вычисляем диапазон цен на основе вариантов
  const prices = product.variants?.map((v) => Number(v.price)) || [];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  // Форматирование цены
  let priceDisplay = 'Цена по запросу';
  if (prices.length > 0) {
    if (minPrice === maxPrice) {
      priceDisplay = formatCurrency(minPrice);
    } else {
      priceDisplay = `от ${formatCurrency(minPrice)}`;
    }
  }

  // Главное изображение
  const mainImage = product.images?.find((img) => img.isMain)?.imageUrl || product.images?.[0]?.imageUrl;
  // Заглушка, если фото нет
  const imageSrc = mainImage || 'https://via.placeholder.com/300x200?text=No+Image';

  return (
    <Link to={ROUTES.PRODUCT(product.id)}>
      <Card
        hoverable
        cover={
          <div className="h-[200px] overflow-hidden flex items-center justify-center bg-gray-50">
            <img 
              alt={product.name} 
              src={imageSrc} 
              className="object-contain h-full w-full"
            />
          </div>
        }
        className="h-full shadow-sm hover:shadow-md transition-shadow"
      >
        <Meta
          title={<div className="truncate" title={product.name}>{product.name}</div>}
          description={
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <ShopOutlined />
                <span className="truncate max-w-[180px]">
                  {product.supplier?.name || product.supplierName || `Поставщик #${product.supplierCompanyId}`}
                </span>
              </div>
              
              <div className="mt-1">
                <Text strong className="text-lg text-primary">
                  {priceDisplay}
                </Text>
              </div>

              {product.variants?.length > 0 && (
                <div className="flex gap-1 flex-wrap h-[24px] overflow-hidden">
                  {product.variants.slice(0, 2).map(v => (
                    <Tag key={v.id} className="text-[10px] m-0 mr-1">
                      {v.variantName}
                    </Tag>
                  ))}
                  {product.variants.length > 2 && <Tag className="text-[10px]">+{product.variants.length - 2}</Tag>}
                </div>
              )}
            </div>
          }
        />
      </Card>
    </Link>
  );
};