import { DealStatus } from '@/shared/config/enums';

export const getDealStatusColor = (status: number): string => {
  switch (status) {
    case DealStatus.CREATED: return 'blue';
    case DealStatus.AGREED: return 'cyan';
    case DealStatus.PAID: return 'green';
    case DealStatus.SHIPPED: return 'geekblue';
    case DealStatus.COMPLETED: return 'success';
    case DealStatus.CANCELED: return 'default';
    case DealStatus.DISPUTE: return 'red';
    default: return 'default';
  }
};