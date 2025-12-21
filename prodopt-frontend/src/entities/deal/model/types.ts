import { ProductVariant, Product } from '@/entities/product/model/types';
import { Company } from '@/entities/user/model/types';

// Enums (синхронизированы с бэкендом)
export enum RequestStatus {
  NEW = 1,
  CLOSED = 2,
}

export enum OfferStatus {
  SENT = 1,
  ACCEPTED = 2,
  REJECTED = 3,
}

// RFQ (Запрос на закупку)
export interface PurchaseRequest {
  id: number;
  comment: string;
  requestStatusId: number;
  buyerCompanyId: number;
  supplierCompanyId?: number | null;
  productVariantId?: number;
  requestedQuantity?: number;
  createdAt: string;

  // Relations
  buyer?: Company;
  supplier?: Company;
  targetVariant?: ProductVariant & { product?: Product; measurementUnit?: { name: string } };
  offers?: CommercialOffer[];
}

// Offer Item (Позиция в оффере)
export interface OfferItem {
  id: number;
  productVariantId: number;
  quantity: number;
  pricePerUnit: number; // или string, если Decimal
  
  // Relations
  productVariant?: ProductVariant & { product?: Product };
}

// Offer (Коммерческое предложение)
export interface CommercialOffer {
  id: number;
  purchaseRequestId: number;
  supplierCompanyId: number;
  offerPrice: number;
  deliveryConditions: string;
  expiresOn: string;
  offerStatusId: number;
  createdAt: string;

  // Relations
  purchaseRequest?: PurchaseRequest;
  supplier?: Company;
  items: OfferItem[];
}

// DTOs
export interface CreateRfqDto {
  comment: string;
  supplierCompanyId?: number | null;
  productVariantId?: number;
  quantity?: number;
}

export interface CreateOfferDto {
  requestId: number;
  offerPrice: number;
  deliveryConditions: string;
  expiresOn: string;
  items: {
    productVariantId: number;
    quantity: number;
    pricePerUnit: number;
  }[];
}

export interface NegotiateOfferDto {
  offerPrice?: number;
  deliveryConditions?: string;
}