import { Layout, Typography, Button } from 'antd';
import { ProductFilters } from '@/features/catalog/ProductFilters';
import { ProductList } from '@/widgets/ProductList';
import { PlusOutlined } from '@ant-design/icons';
import { usePermission } from '@/shared/lib/permissions';
import { Link } from 'react-router-dom';

const { Title } = Typography;
const { Sider, Content } = Layout;

export const CatalogPage = () => {
  // ИСПРАВЛЕНИЕ: Заменили isAdmin на isCompanyAdmin
  const { isManager, isCompanyAdmin } = usePermission(); 
  
  // Кнопку видит либо менеджер, либо админ компании
  const canCreate = isManager || isCompanyAdmin;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="!mb-0">Каталог товаров</Title>
        {canCreate && (
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