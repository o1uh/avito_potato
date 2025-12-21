import { useQuery } from '@tanstack/react-query';
import { List, Rate, Typography, Spin, Empty, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { governanceApi } from '@/entities/governance/api/governance.api';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface Props {
  companyId: number;
}

export const CompanyReviews = ({ companyId }: Props) => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', companyId],
    queryFn: () => governanceApi.getCompanyReviews(companyId),
    enabled: !!companyId,
  });

  if (isLoading) return <div className="p-4 text-center"><Spin /></div>;
  
  if (!reviews || reviews.length === 0) {
    return <Empty description="Отзывов пока нет" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  // Расчет среднего рейтинга
  const averageRating = (reviews.reduce((acc, r) => acc + r.serviceRating, 0) / reviews.length).toFixed(1);

  return (
    <div className="bg-white rounded-lg">
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-800">{averageRating}</div>
          <Rate disabled allowHalf value={Number(averageRating)} className="text-sm" />
          <div className="text-xs text-gray-500 mt-1">{reviews.length} оценок</div>
        </div>
        <div className="border-l pl-4 border-gray-200">
          <Title level={5} className="!mb-1">Рейтинг надежности</Title>
          <Text type="secondary" className="text-xs">На основе завершенных сделок</Text>
        </div>
      </div>

      <List
        itemLayout="horizontal"
        dataSource={reviews}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#fde3cf', color: '#f56a00' }} />}
              title={
                <div className="flex justify-between items-start">
                  <span className="font-medium">{item.author.name}</span>
                  <span className="text-xs text-gray-400">
                    {dayjs(item.createdAt).format('DD.MM.YYYY')}
                  </span>
                </div>
              }
              description={
                <div className="mt-1">
                  <Rate disabled value={item.serviceRating} style={{ fontSize: 12 }} />
                  <div className="mt-2 text-gray-700">{item.serviceComment}</div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};