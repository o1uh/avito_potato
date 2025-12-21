import { useState } from 'react';
import { Table, Tag, Button, Empty, Card } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { governanceApi } from '@/entities/governance/api/governance.api';
import { Dispute } from '@/entities/governance/model/types';
import { ResolveDisputeForm } from '@/features/governance/ResolveDisputeForm';
import dayjs from 'dayjs';

export const ArbitrationList = () => {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: governanceApi.getAllDisputes,
  });

  const columns = [
    {
      title: 'Сделка',
      dataIndex: 'dealId',
      key: 'dealId',
      render: (id: number) => <span>#{id}</span>,
    },
    {
      title: 'Истец',
      dataIndex: ['claimant', 'name'],
      key: 'claimant',
    },
    {
      title: 'Причина',
      dataIndex: 'disputeReason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Дата',
      dataIndex: 'openedAt',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Статус',
      dataIndex: 'disputeStatusId',
      key: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'red' : 'green'}>
          {status === 1 ? 'Открыт' : 'Закрыт'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Dispute) => (
        record.disputeStatusId === 1 ? (
          <Button type="primary" size="small" onClick={() => setSelectedDispute(record)}>
            Решить
          </Button>
        ) : <span className="text-gray-400">Решено</span>
      ),
    },
  ];

  if (isLoading) return <Card loading />;
  if (!disputes || disputes.length === 0) return <Empty description="Нет активных споров" />;

  return (
    <>
      <Table 
        dataSource={disputes} 
        columns={columns} 
        rowKey="id" 
        pagination={{ pageSize: 10 }} 
      />

      {selectedDispute && (
        <ResolveDisputeForm 
          dispute={selectedDispute}
          open={!!selectedDispute}
          onCancel={() => setSelectedDispute(null)}
        />
      )}
    </>
  );
};