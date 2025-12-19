import { UserRole } from '@/shared/config/enums';

// Простая функция для Unit-тестов
export const isAdmin = (roleId: number): boolean => {
  return roleId === UserRole.ADMIN;
};

// В будущем здесь будет хук usePermission