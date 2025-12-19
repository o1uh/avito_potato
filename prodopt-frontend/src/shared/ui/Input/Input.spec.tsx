import { render, screen } from '@testing-library/react';
import { Input } from './index';

describe('UI: Input', () => {
  it('should render input', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('should show error state', () => {
    const { container } = render(<Input status="error" />);
    
    // Проверка: Ant Design добавляет класс 'ant-input-status-error'
    const input = container.querySelector('input');
    expect(input).toHaveClass('ant-input-status-error');
  });
});