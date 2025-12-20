import { Company } from '@/entities/user/model/types';

export enum RequestStatus {
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3,
}

export interface CooperationRequest {
  id: number;
  message: string;
  // Исправлено на camelCase (как возвращает Prisma Client)
  initiatorCompanyId: number; 
  recipientCompanyId: number;
  requestStatusId: number; // или request_status_id (зависит от маппинга, обычно Prisma делает camelCase, если нет @map в модели, но у нас в схеме поля с @map. Давайте проверим API)
  
  // В схеме Prisma: initiator_company_id Int. Prisma Client генерирует: initiator_company_id (если не переименовано).
  // НО! Обычно в JS-мире Prisma делает camelCase для полей по умолчанию, 
  // ОДНАКО у нас в схеме написано: initiator_company_id Int.
  // Давай посмотрим на sendRequest в сервисе: data: { initiator_company_id: ... }
  // Значит, поля приходят как в схеме.
  // 
  // А вот даты createdAt и updatedAt Prisma генерирует сама и дает им camelCase имена, 
  // так как в схеме написано: createdAt DateTime @map("created_at")
  
  initiator_company_id: number;
  recipient_company_id: number;
  request_status_id: number;
  
  createdAt: string; // Было created_at -> стало createdAt
  updatedAt: string; // Было updated_at -> стало updatedAt
  
  // Relations
  initiatorCompany?: Partial<Company>;
  recipientCompany?: Partial<Company>;
}

export type PartnerRelationStatus = 'NONE' | 'PENDING_INCOMING' | 'PENDING_OUTGOING' | 'APPROVED';