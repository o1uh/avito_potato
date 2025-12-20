import { render, screen } from '@testing-library/react';
import { Button } from './index';

describe('UI: Button', () => {
  it('should render children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should verify loading state', () => {
    const { container } = render(<Button loading>Loading...</Button>);
    
    const button = screen.getByRole('button');

    // Ant Design v5 не ставит атрибут disabled, а блокирует клики через CSS и класс.
    // Поэтому вместо toBeDisabled() проверяем наличие класса загрузки.
    expect(button).toHaveClass('ant-btn-loading');

    // Проверка 2: Наличие иконки спиннера
    // AntD вставляет span с иконкой
    const loadingIcon = container.querySelector('.ant-btn-loading-icon');
    expect(loadingIcon).toBeInTheDocument();
  });
});