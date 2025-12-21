import { Card, Row, Col, Statistic, Typography, Tabs } from 'antd';
import { UserOutlined, ShopOutlined, CheckCircleOutlined, AlertOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/entities/admin/api/admin.api';
import { ArbitrationList } from '@/widgets/ArbitrationList';
import { ModerationList } from '@/widgets/ModerationList';
import { Loader } from '@/shared/ui/Loader';
import { usePermission } from '@/shared/lib/permissions';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

const { Title } = Typography;

export const DashboardPage = () => {
  const { isPlatformAdmin } = usePermission();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    enabled: isPlatformAdmin
  });

  if (!isPlatformAdmin) return <Navigate to={ROUTES.HOME} />;
  if (isLoading) return <Loader />;

  const tabItems = [
    {
      key: 'moderation',
      label: 'Модерация товаров',
      children: <ModerationList />
    },
    {
      key: 'arbitration',
      label: `Арбитраж ${stats?.activeDisputes ? `(${stats.activeDisputes})` : ''}`,
      children: <ArbitrationList />
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Title level={2}>Панель Администратора</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title="Пользователи" 
              value={stats?.users} 
              prefix={<UserOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title="Компании" 
              value={stats?.companies} 
              prefix={<ShopOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title="Завершенные сделки" 
              value={stats?.successfulDeals} 
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title="Активные споры" 
              value={stats?.activeDisputes} 
              valueStyle={{ color: stats?.activeDisputes ? '#cf1322' : undefined }} 
              prefix={<AlertOutlined />} 
            />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs defaultActiveKey="moderation" items={tabItems} />
      </Card>
    </div>
  );
};