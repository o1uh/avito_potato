import { useQuery } from '@tanstack/react-query';
import { Descriptions, Card, Table, Tag, Typography, Divider } from 'antd';
import { companyApi } from '@/entities/user/api/company.api';
import { AddBankAccountForm } from '@/features/profile/AddBankAccountForm';
import { AddAddressForm } from '@/features/profile/AddAddressForm';
import { InviteMemberModal } from '@/features/team/InviteMemberModal';
import { MemberActions } from '@/features/team/MemberActions';
import { Loader } from '@/shared/ui/Loader';
import { BankAccount, TeamMember } from '@/entities/user/model/types';
import { CompanyReviews } from '@/widgets/CompanyReviews'; // <--- Импорт виджета

const { Title } = Typography;

export const CompanyPage = () => {
  const { data: company, isLoading: isCompanyLoading } = useQuery({
    queryKey: ['myCompany'],
    queryFn: companyApi.getMyCompany,
  });

  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ['team'],
    queryFn: companyApi.getTeam,
  });

  if (isCompanyLoading || isTeamLoading) return <Loader />;
  if (!company) return <div>Компания не найдена</div>;

  const bankColumns = [
    { title: 'Банк', dataIndex: 'bankName', key: 'bankName' },
    { title: 'БИК', dataIndex: 'bik', key: 'bik' },
    { title: 'Расчетный счет', dataIndex: 'checkingAccount', key: 'checkingAccount' },
    { 
      title: 'Статус', 
      key: 'isPrimary',
      render: (_: any, record: BankAccount) => (
        record.isPrimary && <Tag color="blue">Основной</Tag>
      )
    },
  ];

  const teamColumns = [
    { title: 'ФИО', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Роль', 
      dataIndex: 'roleInCompanyId', 
      key: 'role',
      render: (roleId: number) => (
        <Tag color={roleId === 1 ? 'gold' : 'blue'}>
          {roleId === 1 ? 'Администратор' : 'Менеджер'}
        </Tag>
      )
    },
    { 
      title: 'Статус', 
      dataIndex: 'isActive', 
      key: 'status',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Активен' : 'Заблокирован'}
        </Tag>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: TeamMember) => <MemberActions member={record} />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="m-0">{company.name}</Title>
          <div className="text-gray-500">ИНН: {company.inn} | ОГРН: {company.ogrn}</div>
        </div>
        <Tag color={company.verificationStatusId === 2 ? 'green' : 'orange'} className="text-lg py-1 px-3">
          {company.verificationStatusId === 2 ? 'Верифицирована' : 'Не верифицирована'}
        </Tag>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ЛЕВАЯ КОЛОНКА: Основная инфо */}
        <div className="lg:col-span-2 space-y-8">
          <Card title="Реквизиты и Адреса" className="shadow-sm">
            <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
              <Descriptions.Item label="Полное наименование">{company.name}</Descriptions.Item>
              <Descriptions.Item label="ИНН">{company.inn}</Descriptions.Item>
              <Descriptions.Item label="КПП">{company.kpp || '-'}</Descriptions.Item>
              <Descriptions.Item label="ОГРН">{company.ogrn}</Descriptions.Item>
              <Descriptions.Item label="Описание" span={2}>{company.description || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>Адреса</Divider>
            <div className="mb-4">
              <AddAddressForm />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.addresses?.map((item: any) => (
                <div key={item.address.id} className="p-4 border rounded bg-gray-50">
                  <div className="font-bold text-gray-700 mb-1">{item.addressType.name}</div>
                  <div>{item.address.postalCode}, {item.address.country}, {item.address.city}, {item.address.street}, {item.address.house}</div>
                </div>
              ))}
              {(!company.addresses || company.addresses.length === 0) && (
                <div className="text-gray-400 italic p-4">Адреса не добавлены</div>
              )}
            </div>
          </Card>

          <Card 
            title="Банковские счета" 
            className="shadow-sm"
            extra={<AddBankAccountForm />}
          >
            <Table 
              dataSource={company.paymentDetails || []} 
              columns={bankColumns} 
              rowKey="id" 
              pagination={false} 
            />
          </Card>

          <Card 
            title="Команда" 
            className="shadow-sm"
            extra={<InviteMemberModal />}
          >
            <Table 
              dataSource={team || []} 
              columns={teamColumns} 
              rowKey="id" 
              pagination={false} 
            />
          </Card>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Рейтинг и Отзывы */}
        <div className="lg:col-span-1">
          <Card title="Репутация" className="shadow-sm sticky top-24">
             <CompanyReviews companyId={company.id} />
          </Card>
        </div>
      </div>
    </div>
  );
};