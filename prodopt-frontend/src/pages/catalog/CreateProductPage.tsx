import { Typography, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { CreateProductForm } from '@/features/catalog/CreateProductForm';

const { Title } = Typography;

export const CreateProductPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)} 
          className="mb-2 pl-0"
        >
          Назад
        </Button>
        <Title level={2}>Новый товар</Title>
      </div>
      
      <CreateProductForm />
    </div>
  );
};