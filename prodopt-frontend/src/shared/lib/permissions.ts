import { useSessionStore } from '@/entities/session/model/store';
import { UserRole } from '@/shared/config/enums';

// Вспомогательные чистые функции (используются в тестах и внутри хука)
export const isAdmin = (roleId?: number): boolean => {
  return roleId === UserRole.ADMIN;
};

export const isManager = (roleId?: number): boolean => {
  return roleId === UserRole.MANAGER;
};

// Основной хук для использования в компонентах
export const usePermission = () => {
  const user = useSessionStore((state) => state.user);

  return {
    isAdmin: isAdmin(user?.roleInCompanyId),
    isManager: isManager(user?.roleInCompanyId),
    // Пример составного права: управлять командой может только админ
    canManageTeam: isAdmin(user?.roleInCompanyId),
    companyId: user?.companyId,
  };
};