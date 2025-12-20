import { validateInn } from './validators';

describe('Validators: validateInn', () => {
  // Реальные валидные ИНН для тестов
  const validJurInn = '7736207543'; // Пример ЮЛ (Яндекс)
  const validIpInn = '770207013930'; // Пример ИП (тестовый, алгоритмически верный)

  it('should return true for valid 10-digit INN (Juridical)', () => {
    expect(validateInn(validJurInn)).toBe(true);
  });

  it('should return true for valid 12-digit INN (Individual)', () => {
    expect(validateInn(validIpInn)).toBe(true);
  });

  it('should return false for invalid checksum', () => {
    // Меняем последнюю цифру валидного ИНН
    const invalidInn = '7736207544'; 
    expect(validateInn(invalidInn)).toBe(false);
  });

  it('should return false for random digits', () => {
    expect(validateInn('1234567890')).toBe(false);
  });

  it('should return false for non-digits', () => {
    expect(validateInn('ABC1234567')).toBe(false);
  });

  it('should return false for wrong length', () => {
    expect(validateInn('773620754')).toBe(false); // 9 цифр
    expect(validateInn('77362075431')).toBe(false); // 11 цифр
  });
});