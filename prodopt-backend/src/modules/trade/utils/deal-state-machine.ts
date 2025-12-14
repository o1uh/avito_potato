export enum DealStatus {
  CREATED = 1,
  AGREED = 2,
  PAID = 3,
  SHIPPED = 4,
  COMPLETED = 5,
  CANCELED = 6,
  DISPUTE = 7,
}

export class DealStateMachine {
  private static transitions = {
    [DealStatus.CREATED]: [DealStatus.AGREED, DealStatus.CANCELED],
    [DealStatus.AGREED]: [DealStatus.PAID, DealStatus.CANCELED],
    [DealStatus.PAID]: [DealStatus.SHIPPED, DealStatus.CANCELED, DealStatus.DISPUTE],
    [DealStatus.SHIPPED]: [DealStatus.COMPLETED, DealStatus.DISPUTE],
    [DealStatus.DISPUTE]: [DealStatus.COMPLETED, DealStatus.CANCELED, DealStatus.PAID], // PAID = возврат к исполнению
    [DealStatus.COMPLETED]: [],
    [DealStatus.CANCELED]: [],
  };

  static canTransition(from: number, to: number): boolean {
    const allowed = this.transitions[from] || [];
    return allowed.includes(to);
  }
}