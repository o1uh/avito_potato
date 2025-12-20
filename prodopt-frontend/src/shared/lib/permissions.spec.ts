import { isAdmin } from './permissions';
import { UserRole } from '@/shared/config/enums';

describe('Lib: Permissions', () => {
  it('isAdmin should return true for roleId = 1 (Admin)', () => {
    expect(isAdmin(UserRole.ADMIN)).toBe(true);
  });

  it('isAdmin should return false for roleId = 2 (Manager)', () => {
    expect(isAdmin(UserRole.MANAGER)).toBe(false);
  });
});