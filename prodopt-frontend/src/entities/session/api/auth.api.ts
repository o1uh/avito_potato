import { $api } from '@/shared/api/base';
import { ApiResponse } from '@/shared/api/types';
import { User } from '@/entities/user/model/types';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: async (dto: any) => {
    const response = await $api.post<ApiResponse<AuthResponse>>('/auth/login', dto);
    return response.data.data;
  },
  
  register: async (dto: any) => {
    const response = await $api.post<ApiResponse<AuthResponse>>('/auth/register', dto);
    return response.data.data;
  },

  logout: async () => {
    await $api.post('/auth/logout');
  },

  getProfile: async () => {
    const response = await $api.get<ApiResponse<User>>('/users/profile');
    return response.data.data;
  }
};