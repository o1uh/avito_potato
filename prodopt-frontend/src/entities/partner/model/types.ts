import { Company } from '@/entities/user/model/types';

export enum RequestStatus {
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3,
}

export interface CooperationRequest {
  id: number;
  message: string;
  initiator_company_id: number;
  recipient_company_id: number;
  request_status_id: number;
  created_at: string;
  updated_at: string;
  
  // Relations (camelCase, т.к. Prisma include)
  initiatorCompany?: Partial<Company>;
  recipientCompany?: Partial<Company>;
}

// Вспомогательный тип для кнопки
export type PartnerRelationStatus = 'NONE' | 'PENDING_INCOMING' | 'PENDING_OUTGOING' | 'APPROVED';