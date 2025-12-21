import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

// Моковые данные (так как бэкенд пока не отдает историю по дням)
const data = [
  { name: 'Янв', sales: 4000, purchases: 2400 },
  { name: 'Фев', sales: 3000, purchases: 1398 },
  { name: 'Мар', sales: 2000, purchases: 9800 },
  { name: 'Апр', sales: 2780, purchases: 3908 },
  { name: 'Май', sales: 1890, purchases: 4800 },
  { name: 'Июн', sales: 2390, purchases: 3800 },
  { name: 'Июл', sales: 3490, purchases: 4300 },
];

export const SalesChart = () => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip />
        <Area type="monotone" dataKey="sales" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.2} name="Продажи" />
        <Area type="monotone" dataKey="purchases" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Закупки" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const DealsStructureChart = () => {
    const dealData = [
        { name: 'Молоко', value: 4000 },
        { name: 'Картофель', value: 3000 },
        { name: 'Мясо', value: 2000 },
    ];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dealData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} />
            <Tooltip cursor={{fill: 'transparent'}} />
            <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} name="Оборот" />
        </BarChart>
      </ResponsiveContainer>
    );
}