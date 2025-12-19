export const validateInn = (inn: string): boolean => {
  if (!inn) return false;
  
  // Проверка на цифры
  if (!/^\d+$/.test(inn)) return false;

  const checkDigit = (inn: string, coefficients: number[]): number => {
    let n = 0;
    for (let i = 0; i < coefficients.length; i++) {
      n += coefficients[i] * parseInt(inn[i]);
    }
    return (n % 11) % 10;
  };

  // Юр. лицо (10 цифр)
  if (inn.length === 10) {
    const n10 = checkDigit(inn, [2, 4, 10, 3, 5, 9, 4, 6, 8]);
    return n10 === parseInt(inn[9]);
  }

  // ИП (12 цифр)
  if (inn.length === 12) {
    const n11 = checkDigit(inn, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
    const n12 = checkDigit(inn, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
    return n11 === parseInt(inn[10]) && n12 === parseInt(inn[11]);
  }

  return false;
};