import { Card, Row, Col, Statistic, Typography } from 'antd';
import { UserOutlined, ShopOutlined, AlertOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { $api } from '@/shared/api/base';
import { ArbitrationList } from '@/widgets/ArbitrationList';
import { Loader } from '@/shared/ui/Loader';
import { usePermission } from '@/shared/lib/permissions';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

const { Title } = Typography;

export const DashboardPage = () => {
  const { isPlatformAdmin } = usePermission();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await $api.get('/admin/stats');
      return res.data;
    },
    enabled: isPlatformAdmin
  });

  if (!isPlatformAdmin) return <Navigate to={ROUTES.HOME} />;
  if (isLoading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Title level={2}>Панель Администратора</Title>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="Пользователи" value={stats?.users} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Компании" value={stats?.companies} prefix={<ShopOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Успешные сделки" value={stats?.successfulDeals} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Активные споры" value={stats?.activeDisputes} valueStyle={{ color: '#cf1322' }} prefix={<AlertOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="Арбитраж (Активные споры)">
            <ArbitrationList />
          </Card>
        </Col>
      </Row>
    </div>
  );
};