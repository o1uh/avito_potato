import { Card, Statistic, Row, Col, Spin, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { companyApi } from '@/entities/user/api/company.api';
import { formatCurrency } from '@/shared/lib/currency';

export const CompanyStats = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['companyStats'],
    queryFn: companyApi.getStats,
  });

  if (isLoading) return <Spin size="large" className="w-full py-10 flex justify-center" />;
  if (isError) return <Alert message="Ошибка загрузки статистики" type="error" />;

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Продажи (Объем)"
              value={data?.salesVolume}
              precision={2}
              formatter={(val) => formatCurrency(val)}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Закупки (Объем)"
              value={data?.purchasesVolume}
              precision={2}
              formatter={(val) => formatCurrency(val)}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Сделок (Продажа)"
              value={data?.totalSales}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Сделок (Закупка)"
              value={data?.totalPurchases}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};