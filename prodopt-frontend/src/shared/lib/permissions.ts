import { useSessionStore } from '@/entities/session/model/store';
import { UserRole } from '@/shared/config/enums';

// Вспомогательные чистые функции
export const isAdmin = (roleId?: number): boolean => {
  return roleId === UserRole.ADMIN;
};

export const isManager = (roleId?: number): boolean => {
  return roleId === UserRole.MANAGER;
};

// Основной хук
export const usePermission = () => {
  const user = useSessionStore((state) => state.user);

  return {
    // Является ли Администратором СВОЕЙ компании
    isCompanyAdmin: isAdmin(user?.roleInCompanyId),
    
    // Является ли Менеджером
    isManager: isManager(user?.roleInCompanyId),
    
    // Может ли управлять командой (только админ компании)
    canManageTeam: isAdmin(user?.roleInCompanyId),
    
    // Является ли СУПЕР-АДМИНОМ всей платформы
    // В seed.ts мы создали его с ID 1
    isPlatformAdmin: user?.id === 1,
    
    companyId: user?.companyId,
  };
};