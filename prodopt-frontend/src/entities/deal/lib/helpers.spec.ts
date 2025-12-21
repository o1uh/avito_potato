import { getDealStatusColor } from './helpers';
import { DealStatus } from '@/shared/config/enums';

describe('Entity: Deal Helpers', () => {
  it('should return correct color for PAID status', () => {
    expect(getDealStatusColor(DealStatus.PAID)).toBe('green');
  });

  it('should return correct color for DISPUTE status', () => {
    expect(getDealStatusColor(DealStatus.DISPUTE)).toBe('red');
  });

  it('should return default color for unknown status', () => {
    expect(getDealStatusColor(999)).toBe('default');
  });
});