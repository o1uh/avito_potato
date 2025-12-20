import { useState } from 'react';
import { Steps, Card, message } from 'antd';
import { MainStep } from './MainStep';
import { VariantsStep } from './VariantsStep';
import { ImagesStep } from './ImagesStep';
import { productApi } from '@/entities/product/api/product.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

export const CreateProductForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  // Храним данные первых двух шагов
  const [productData, setProductData] = useState<any>({});
  // ID созданного товара (получаем после 2 шага)
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Мутация создания товара
  const createMutation = useMutation({
    mutationFn: productApi.create,
    onSuccess: (data) => {
      setCreatedProductId(data.id);
      setCurrentStep(2); // Переход к фото
      message.success('Товар создан! Теперь добавьте фото.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'Ошибка создания товара');
    }
  });

  const next = () => setCurrentStep(currentStep + 1);
  const prev = () => setCurrentStep(currentStep - 1);

  // Обработчик данных с 1 шага
  const handleMainInfoSubmit = (values: any) => {
    setProductData({ ...productData, ...values });
    next();
  };

  // Обработчик данных со 2 шага -> отправка на сервер
  const handleVariantsSubmit = (values: any) => {
    const finalPayload = {
      ...productData,
      variants: values.variants
    };
    createMutation.mutate(finalPayload);
  };

  // Завершение визарда
  const handleFinish = () => {
    message.success('Товар успешно оформлен');
    navigate(ROUTES.CATALOG);
  };

  const steps = [
    {
      title: 'Основное',
      content: <MainStep initialValues={productData} onFinish={handleMainInfoSubmit} />,
    },
    {
      title: 'Варианты',
      content: <VariantsStep onFinish={handleVariantsSubmit} onBack={prev} isLoading={createMutation.isPending} />,
    },
    {
      title: 'Фото',
      content: <ImagesStep productId={createdProductId!} onFinish={handleFinish} />,
    },
  ];

  return (
    <Card className="max-w-4xl mx-auto shadow-md">
      <Steps current={currentStep} items={steps.map((item) => ({ key: item.title, title: item.title }))} className="mb-8" />
      <div className="steps-content">{steps[currentStep].content}</div>
    </Card>
  );
};