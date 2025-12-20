import { Layout, Typography, Button } from 'antd';
import { ProductFilters } from '@/features/catalog/ProductFilters';
import { ProductList } from '@/widgets/ProductList';
import { PlusOutlined } from '@ant-design/icons';
import { usePermission } from '@/shared/lib/permissions';
import { Link } from 'react-router-dom';

const { Title } = Typography;
const { Sider, Content } = Layout;

export const CatalogPage = () => {
  // Если пользователь может создавать товары (менеджер/админ), покажем кнопку
  const { isManager, isAdmin } = usePermission();
  const canCreate = isManager || isAdmin;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="!mb-0">Каталог товаров</Title>
        {canCreate && (
          // В будущем здесь будет ссылка на страницу создания товара
          // Пока просто заглушка или Link, если роут уже есть
          <Link to="/catalog/create">
             <Button type="primary" icon={<PlusOutlined />}>Разместить товар</Button>
          </Link>
        )}
      </div>

      <Layout className="bg-transparent gap-6">
        {/* Боковая панель фильтров */}
        <Sider 
          width={280} 
          breakpoint="lg" 
          collapsedWidth="0"
          className="!bg-transparent"
          zeroWidthTriggerStyle={{ top: 10 }}
        >
          <ProductFilters />
        </Sider>

        {/* Основной контент */}
        <Content>
          <ProductList />
        </Content>
      </Layout>
    </div>
  );
};