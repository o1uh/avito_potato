export interface Address {
  id: number;
  postalCode?: string;
  country: string;
  region?: string;
  city?: string;
  street?: string;
  house?: string;
  building?: string;
  apartment?: string;
  comment?: string;
  // Тип адреса (Юридический, Склад и т.д.)
  addressType?: { id: number; name: string };
}

export interface BankAccount {
  id: number;
  bankName: string;
  bik: string;
  checkingAccount: string;
  correspondentAccount: string;
  isPrimary: boolean;
}

export interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  roleInCompanyId: number;
  position?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Company {
  id: number;
  name: string;
  inn: string;
  kpp?: string;
  ogrn: string;
  description?: string;
  rating: number;
  organizationTypeId: number;
  verificationStatusId?: number;
  addresses?: { address: Address; addressType: { name: string } }[];
  paymentDetails?: BankAccount[];
}

export interface CompanyStats {
  totalSales: number;
  totalPurchases: number;
  salesVolume: number;
  purchasesVolume: number;
  message?: string;
}