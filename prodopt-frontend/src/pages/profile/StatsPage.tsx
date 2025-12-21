import { CompanyStats } from '@/widgets/CompanyStats';
import { Card, Typography } from 'antd';
// Импорт новых графиков
import { SalesChart, DealsStructureChart } from '@/widgets/CompanyStats/SalesChart'; 

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
        {/* График 1 */}
        <Card title="Динамика оборота (Демо)" className="shadow-sm h-[350px]">
          <div className="h-[280px] w-full">
            <SalesChart />
          </div>
        </Card>

        {/* График 2 */}
        <Card title="Топ категорий (Демо)" className="shadow-sm h-[350px]">
          <div className="h-[280px] w-full">
            <DealsStructureChart />
          </div>
        </Card>
      </div>
    </div>
  );
};