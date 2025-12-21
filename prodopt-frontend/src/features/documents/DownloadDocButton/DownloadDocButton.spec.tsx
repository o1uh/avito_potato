/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DownloadDocButton } from './index';
import { $api } from '@/shared/api/base';
import '@testing-library/jest-dom';

// 1. Мокаем API
jest.mock('@/shared/api/base');

// 2. Мокаем Ant Design БЕЗ JSX внутри фабрики (используем React.createElement)
// Это предотвращает ошибки компиляции, если среда не настроена идеально
jest.mock('antd', () => {
  const React = require('react');
  return {
    Button: ({ children, onClick, disabled, loading }: any) => {
      return React.createElement('button', {
        onClick: onClick,
        disabled: disabled,
        'data-loading': loading ? 'true' : 'false', // Атрибут для проверки в тесте
        type: 'button'
      }, children);
    },
    message: {
      error: jest.fn(),
      success: jest.fn(),
    }
  };
});

// 3. Мокаем иконки
jest.mock('@ant-design/icons', () => {
  const React = require('react');
  return {
    FilePdfOutlined: () => React.createElement('span', {}, 'PdfIcon'),
    LoadingOutlined: () => React.createElement('span', {}, 'LoadingIcon'),
    DownloadOutlined: () => React.createElement('span', {}, 'DownloadIcon'),
  };
});

describe('Feature: DownloadDocButton', () => {
  // Сохраняем оригинальные методы
  const originalCreateElement = document.createElement.bind(document);

  beforeAll(() => {
    // Мокаем URL методы, которых нет в JSDOM
    global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Фикс для matchMedia (на всякий случай, если глобальный сетап не сработал)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should download file on click via Blob strategy', async () => {
    const docId = 123;
    const fileName = 'Contract.pdf';
    const mockBlobData = new Blob(['fake content'], { type: 'application/pdf' });

    // 1. Мокаем ответ
    ($api.get as jest.Mock).mockResolvedValue({
      data: mockBlobData,
    });

    // 2. Шпионим за созданием ссылки
    const linkClickSpy = jest.fn();
    
    // Перехватываем createElement ТОЛЬКО для тега 'a'
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a');
        anchor.click = linkClickSpy; // Подменяем метод click
        return anchor;
      }
      return originalCreateElement(tagName);
    });

    // 3. Рендер
    render(<DownloadDocButton documentId={docId} fileName={fileName} />);
    
    // Отладка: если упадет, раскомментируй screen.debug()
    // screen.debug(); 

    const button = screen.getByRole('button');

    // 4. Действие
    fireEvent.click(button);

    // 5. Проверка состояния загрузки
    expect(button).toHaveAttribute('data-loading', 'true');

    // 6. Ожидание вызова API
    await waitFor(() => {
      expect($api.get).toHaveBeenCalledWith(`/documents/${docId}/download`, {
        responseType: 'blob',
      });
    });

    // 7. Проверка скачивания
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(linkClickSpy).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is passed', () => {
    render(<DownloadDocButton documentId={1} fileName="test.pdf" disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should stop loading on API error', async () => {
    ($api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

    render(<DownloadDocButton documentId={999} fileName="error.pdf" />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('data-loading', 'false');
    });
  });
});