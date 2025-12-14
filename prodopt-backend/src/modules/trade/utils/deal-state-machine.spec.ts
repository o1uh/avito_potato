import { DealStateMachine, DealStatus } from './deal-state-machine';

describe('DealStateMachine', () => {
  it('should allow valid transition (CREATED -> AGREED)', () => {
    const result = DealStateMachine.canTransition(DealStatus.CREATED, DealStatus.AGREED);
    expect(result).toBe(true);
  });

  it('should allow valid transition (AGREED -> PAID)', () => {
    const result = DealStateMachine.canTransition(DealStatus.AGREED, DealStatus.PAID);
    expect(result).toBe(true);
  });

  it('should allow cancellation from CREATED', () => {
    const result = DealStateMachine.canTransition(DealStatus.CREATED, DealStatus.CANCELED);
    expect(result).toBe(true);
  });

  it('should deny invalid transition (CREATED -> PAID)', () => {
    // Нельзя сразу оплатить, минуя согласование
    const result = DealStateMachine.canTransition(DealStatus.CREATED, DealStatus.PAID);
    expect(result).toBe(false);
  });

  it('should deny backward transition (PAID -> AGREED)', () => {
    const result = DealStateMachine.canTransition(DealStatus.PAID, DealStatus.AGREED);
    expect(result).toBe(false);
  });
});