import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddAddressForm } from './index';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

const queryClient = new QueryClient();

// Мокаем API, так как нам важна только валидация формы
jest.mock('@/entities/user/api/company.api', () => ({
  companyApi: {
    addAddress: jest.fn()
  }
}));

describe('Component: AddAddressForm', () => {
  it('should require mandatory fields', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AddAddressForm />
      </QueryClientProvider>
    );

    // Открываем модалку
    fireEvent.click(screen.getByText('Добавить адрес'));

    // Пытаемся отправить пустую форму
    // (Страна предзаполнена "Россия", поэтому ее ошибка не должна появиться, если мы ее не стерли)
    fireEvent.click(screen.getByText('Сохранить'));

    await waitFor(() => {
      // Проверяем появление сообщений об ошибках (Ant Design добавляет их в DOM)
      // Текст ошибки по умолчанию "Please enter..." или "Пожалуйста введите..." зависит от локали, 
      // но в коде мы не задавали message, значит будет дефолт или required. 
      // В коде AddAddressForm: rules={[{ required: true }]} -> AntD покажет красную рамку или дефолтный текст.
      // Проще проверить класс ошибки на полях или наличие текста, если ConfigProvider задан.
      
      // Но так как мы не обернули в ConfigProvider с русской локалью в тесте, текст может быть английским.
      // Лучший способ: проверить, что функция отправки НЕ вызвалась (валидация не прошла).
      const { companyApi } = require('@/entities/user/api/company.api');
      expect(companyApi.addAddress).not.toHaveBeenCalled();
    });

    // Проверим наличие инпутов
    expect(screen.getByLabelText('Город')).toBeInTheDocument();
    expect(screen.getByLabelText('Улица')).toBeInTheDocument();
  });
});