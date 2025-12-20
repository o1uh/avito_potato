import { CompanyStats } from '@/widgets/CompanyStats';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export const StatsPage = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Title level={2}>Аналитика</Title>
        <p className="text-gray-500">Сводная статистика деятельности вашей компании на платформе.</p>
      </div>
      
      <CompanyStats />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Динамика продаж" className="shadow-sm h-64 flex items-center justify-center text-gray-400">
          График будет добавлен в следующих версиях
        </Card>
        <Card title="Структура сделок" className="shadow-sm h-64 flex items-center justify-center text-gray-400">
          График будет добавлен в следующих версиях
        </Card>
      </div>
    </div>
  );
};