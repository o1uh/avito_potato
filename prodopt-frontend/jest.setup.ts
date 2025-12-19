import '@testing-library/jest-dom';

// Мок для matchMedia (нужен для Ant Design)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Мокаем конфиг окружения, чтобы Jest не встречал import.meta
jest.mock('@/shared/config/env', () => ({
  ENV: {
    API_URL: 'http://localhost:3000',
    MODE: 'test',
    DEV: true,
  },
}));