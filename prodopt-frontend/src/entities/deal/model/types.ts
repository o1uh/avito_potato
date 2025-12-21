import { ProductVariant, Product } from '@/entities/product/model/types';
import { Company, Address } from '@/entities/user/model/types';

// Enums
export enum RequestStatus {
  NEW = 1,
  CLOSED = 2,
}

export enum OfferStatus {
  SENT = 1,
  ACCEPTED = 2,
  REJECTED = 3,
}

export enum DealStatus {
  CREATED = 1,
  AGREED = 2,
  PAID = 3,
  SHIPPED = 4,
  COMPLETED = 5,
  CANCELED = 6,
  DISPUTE = 7,
}

// RFQ & Offer
export interface PurchaseRequest {
  id: number;
  comment: string;
  requestStatusId: number;
  buyerCompanyId: number;
  supplierCompanyId?: number | null;
  productVariantId?: number;
  requestedQuantity?: number;
  createdAt: string;
  buyer?: Company;
  supplier?: Company;
  targetVariant?: ProductVariant & { product?: Product; measurementUnit?: { name: string } };
  offers?: CommercialOffer[];
}

export interface OfferItem {
  id: number;
  productVariantId: number;
  quantity: number;
  pricePerUnit: number;
  productVariant?: ProductVariant & { product?: Product };
}

export interface CommercialOffer {
  id: number;
  purchaseRequestId: number;
  supplierCompanyId: number;
  offerPrice: number;
  deliveryConditions: string;
  expiresOn: string;
  offerStatusId: number;
  createdAt: string;
  purchaseRequest?: PurchaseRequest;
  supplier?: Company;
  items: OfferItem[];
}

// Deal
export interface DealItem {
  id: number;
  dealId: number;
  productVariantId: number;
  quantity: number;
  pricePerUnit: number;
  productNameAtDealMoment: string;
  variantNameAtDealMoment?: string;
  measurementUnitAtDealMoment?: string;
}

export interface EscrowAccount {
  dealId: number;
  totalAmount: number;
  amountDeposited: number;
  platformFeeAmount: number;
  escrowStatusId: number;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  amount: number;
  dealId: number;
  transactionTypeId: number;
  transactionStatusId: number;
  createdAt: string;
}

export interface Shipment {
  id: number;
  trackingNumber: string;
  logisticsService: string;
  sentAt: string;
  expectedDeliveryDate?: string;
  deliveryStatusId: number;
}

export interface Deal {
  id: number;
  buyerCompanyId: number;
  supplierCompanyId: number;
  commercialOfferId?: number;
  totalAmount: number;
  dealStatusId: number;
  deliveryTerms?: string;
  createdAt: string;
  updatedAt: string;
  deliveryAddressId?: number;

  // Relations
  buyer?: Company;
  supplier?: Company;
  commercialOffer?: CommercialOffer;
  deliveryAddress?: Address;
  escrowAccount?: EscrowAccount;
  transactions?: Transaction[];
  items?: DealItem[];
  shipments?: Shipment[];
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

export interface CreateDealFromOfferDto {
  offerId: number;
  closeRequest?: boolean;
}