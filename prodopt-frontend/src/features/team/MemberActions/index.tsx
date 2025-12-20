import { Dropdown, Button, Modal, message } from 'antd';
import { MoreOutlined, DeleteOutlined, UserSwitchOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '@/entities/user/api/company.api';
import { TeamMember } from '@/entities/user/model/types';
import { usePermission } from '@/shared/lib/permissions';
import { useSessionStore } from '@/entities/session/model/store';

interface Props {
  member: TeamMember;
}

export const MemberActions = ({ member }: Props) => {
  const { canManageTeam } = usePermission();
  const currentUser = useSessionStore((s) => s.user);
  const queryClient = useQueryClient();

  // Нельзя редактировать самого себя через этот список
  if (!canManageTeam || member.id === currentUser?.id) return null;

  const deleteMutation = useMutation({
    mutationFn: companyApi.removeMember,
    onSuccess: () => {
      message.success('Сотрудник удален');
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => message.error('Ошибка удаления'),
  });

  const changeRoleMutation = useMutation({
    mutationFn: (roleId: number) => companyApi.changeRole(member.id, roleId),
    onSuccess: () => {
      message.success('Роль обновлена');
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const handleDelete = () => {
    Modal.confirm({
      title: `Удалить сотрудника ${member.fullName}?`,
      content: 'Доступ к платформе будет закрыт.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => deleteMutation.mutate(member.id),
    });
  };

  const handleChangeRole = () => {
    const newRoleId = member.roleInCompanyId === 1 ? 2 : 1;
    const newRoleName = newRoleId === 1 ? 'Администратор' : 'Менеджер';
    
    Modal.confirm({
      title: 'Смена роли',
      content: `Назначить роль "${newRoleName}"?`,
      onOk: () => changeRoleMutation.mutate(newRoleId),
    });
  };

  const items: MenuProps['items'] = [
    {
      key: 'role',
      label: 'Сменить роль',
      icon: <UserSwitchOutlined />,
      onClick: handleChangeRole,
    },
    {
      key: 'delete',
      label: 'Удалить',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Button type="text" icon={<MoreOutlined />} />
    </Dropdown>
  );
};