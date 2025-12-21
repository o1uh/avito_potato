import { Company } from '@/entities/user/model/types';
import { Deal } from '@/entities/deal/model/types';

export enum DisputeStatus {
  OPEN = 1,
  CLOSED = 2,
}

export interface Dispute {
  id: number;
  dealId: number;
  disputeReason: string;
  claimantDemands: string;
  finalDecision?: string;
  refundAmount?: number;
  
  claimantCompanyId: number;
  defendantCompanyId: number;
  arbiterId?: number;
  disputeStatusId: number;
  
  openedAt: string;
  closedAt?: string;

  // Relations
  deal?: Deal;
  claimant?: Company;
  defendant?: Company;
}

export interface CreateDisputeDto {
  reason: string;
  demands: string;
}

export interface ResolveDisputeDto {
  decision: string;
  refundAmount: number;
  winnerCompanyId: number;
}

export interface CreateReviewDto {
  rating: number; // 1-5
  comment: string;
}

// --- НОВЫЙ ТИП ---
export interface Review {
  id: number;
  serviceRating: number;
  serviceComment: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
  };
}