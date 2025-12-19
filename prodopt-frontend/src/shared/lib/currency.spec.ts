import { formatCurrency } from './currency';

describe('Lib: Currency', () => {
  it('should format number to RUB currency', () => {
    // Примечание: пробел в ru локали может быть неразрывным (NBSP, код 160)
    // Поэтому используем toMatch с регуляркой или проверяем наличие символа рубля
    const result = formatCurrency(1000);
    // Ожидаем что-то вроде "1 000 ₽" или "1 000,00 ₽"
    expect(result).toMatch(/1\s?000/);
    expect(result).toContain('₽');
  });

  it('should handle string input', () => {
    expect(formatCurrency('500.50')).toContain('500,5');
  });

  it('should return empty string for NaN', () => {
    expect(formatCurrency('abc')).toBe('');
  });
});