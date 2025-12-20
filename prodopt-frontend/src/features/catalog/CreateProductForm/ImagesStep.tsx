import { Button, Result } from 'antd';
import { ImageUploader } from '@/shared/ui/ImageUploader';
import { productApi } from '@/entities/product/api/product.api';

interface Props {
  productId: number;
  onFinish: () => void;
}

export const ImagesStep = ({ productId, onFinish }: Props) => {
  
  const handleUpload = async (file: File) => {
    // Непосредственная загрузка на сервер
    return productApi.uploadImage(productId, file);
  };

  return (
    <div className="text-center">
      <Result
        status="success"
        title="Товар успешно создан!"
        subTitle={`ID товара: ${productId}. Теперь загрузите фотографии, чтобы покупатели увидели ваш товар.`}
      />
      
      <div className="max-w-md mx-auto my-6 text-left">
        <ImageUploader onUpload={handleUpload} maxCount={5} />
      </div>

      <Button type="primary" size="large" onClick={onFinish} className="px-8">
        Завершить публикацию
      </Button>
    </div>
  );
};