import { $api } from '@/shared/api/base';
// ApiResponse удален из импорта, так как пока не используется явно в дженериках методов
import { Company, TeamMember, BankAccount, CompanyStats } from '../model/types';

export const companyApi = {
  getMyCompany: async () => {
    const response = await $api.get<Company>('/companies/my');
    return response.data;
  },

  addBankAccount: async (dto: Omit<BankAccount, 'id'> & { bankBik: string }) => {
    const response = await $api.post<BankAccount>('/companies/banking', dto);
    return response.data;
  },

  addAddress: async (dto: any) => {
    const response = await $api.post('/companies/addresses', dto);
    return response.data;
  },

  getTeam: async () => {
    const response = await $api.get<TeamMember[]>('/users/team');
    return response.data;
  },

  inviteMember: async (dto: { email: string; fullName: string; roleId: number }) => {
    const response = await $api.post<TeamMember & { tempPassword?: string }>('/users/team/invite', dto);
    return response.data;
  },

  removeMember: async (id: number) => {
    await $api.delete(`/users/team/${id}`);
  },

  changeRole: async (id: number, roleId: number) => {
    await $api.patch(`/users/team/${id}/role`, { roleId });
  },

  getStats: async () => {
    const response = await $api.get<CompanyStats>('/analytics/my-stats');
    return response.data;
  }
};