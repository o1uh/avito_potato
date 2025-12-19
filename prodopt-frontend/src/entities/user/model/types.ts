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
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  position?: string;
  isActive: boolean;
  companyId: number;
  roleInCompanyId: number;
  company?: Company;
}