import { render, screen } from '@testing-library/react';
import { DealInfoCard } from './DealInfoCard';
import '@testing-library/jest-dom';

const mockDeal = {
  id: 1,
  totalAmount: 1000,
  escrowAccount: { amountDeposited: 0, platformFeeAmount: 20 },
  shipments: []
} as any;

describe('UI: DealInfoCard', () => {
  it('should show fee and net amount for Supplier', () => {
    render(<DealInfoCard deal={mockDeal} isSupplier={true} />);
    
    // Ищем текст "Комиссия платформы"
    expect(screen.getByText('Комиссия платформы')).toBeInTheDocument();
    // Ищем "К выплате"
    expect(screen.getByText(/К выплате/)).toBeInTheDocument();
  });

  it('should hide fee info for Buyer', () => {
    render(<DealInfoCard deal={mockDeal} isSupplier={false} />);
    
    expect(screen.queryByText('Комиссия платформы')).not.toBeInTheDocument();
    expect(screen.queryByText(/К выплате/)).not.toBeInTheDocument();
  });
});