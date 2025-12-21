import { Button, Result, Typography, Divider, Spin, message  } from 'antd';
import { ImageUploader } from '@/shared/ui/ImageUploader';
import { productApi } from '@/entities/product/api/product.api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Props {
  productId: number;
  onFinish: () => void;
}

export const ImagesStep = ({ productId, onFinish }: Props) => {
  
  // Загрузчик для главного фото (isMain=true определяется первым загруженным, 
  // но лучше сделать явную логику на бэке или просто считать, что первая зона = главное).
  // В текущем API product-media.service.ts логика: "если фото нет, то оно главное".
  
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getOne(productId),
    enabled: !!productId,
  });

  const [hasMainPhoto, setHasMainPhoto] = useState(false);

  // Обертка для API, чтобы передать variantId
  const handleUpload = async (file: File, variantId?: number) => {
    await productApi.uploadImage(productId, file, variantId);
    
    // Если загрузили фото без варианта, считаем, что обложка есть
    if (!variantId) setHasMainPhoto(true); 
  };

  const handleFinishClick = async () => {
    if (!hasMainPhoto) {
      message.error('Загрузите хотя бы одно общее фото (обложку)!');
      return;
    }

    try {
      // Вызываем публикацию
      await productApi.publish(productId);
      message.success('Товар отправлен на модерацию!');
      onFinish(); // Редирект
    } catch (e: any) {
      // Если бэк вернет ошибку (например, фото реально не загрузились)
      message.error(e.response?.data?.message || 'Ошибка публикации');
    }
  };

  if (isLoading) return <div className="flex justify-center py-10"><Spin size="large" /></div>;

  return (
    <div className="text-center max-w-3xl mx-auto pb-10">
      <Result
        status="success"
        title="Товар создан!"
        subTitle="Настройте внешний вид вашего товара."
      />
      
      {/* БЛОК 1: ОБЩИЕ ФОТО */}
      <div className="text-left mb-8 p-6 border rounded-lg bg-gray-50">
        <Typography.Title level={4}>1. Общие фото товара (Обязательно)</Typography.Title>
        <Typography.Text type="secondary" className="block mb-4">
            Первое загруженное здесь фото станет <b>обложкой</b> товара в каталоге.
        </Typography.Text>
        {/* Здесь variantId не передаем (undefined) */}
        <ImageUploader 
            onUpload={(f) => handleUpload(f)} 
            maxCount={5} 
        />
      </div>

      {/* БЛОК 2: ФОТО ПО ВАРИАНТАМ */}
      {product?.variants && product.variants.length > 0 && (
        <>
          <Divider orientation="left">Фотографии для вариантов (Опционально)</Divider>
          <div className="text-left mb-8">
            <Typography.Text type="secondary" className="block mb-4">
                Загрузите фото для конкретных фасовок, если они отличаются.
            </Typography.Text>

            <div className="grid grid-cols-1 gap-6">
                {product.variants.map(variant => (
                    <div key={variant.id} className="p-4 border border-dashed rounded-lg">
                        <div className="mb-2 font-semibold">
                            {variant.variantName} <span className="text-gray-400 text-sm">({variant.sku})</span>
                        </div>
                        {/* Здесь передаем ID варианта */}
                        <ImageUploader 
                            onUpload={(f) => handleUpload(f, variant.id)} 
                            maxCount={3} 
                        />
                    </div>
                ))}
            </div>
          </div>
        </>
      )}

      <Button type="primary" size="large" onClick={handleFinishClick} className="px-10 h-12 text-lg">
        Отправить на модерацию
      </Button>
    </div>
  );
};