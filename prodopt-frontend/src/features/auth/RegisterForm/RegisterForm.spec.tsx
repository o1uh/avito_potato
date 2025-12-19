import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from './index';
import { $api } from '@/shared/api/base';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Мокаем API и навигацию
jest.mock('@/shared/api/base');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('Feature: RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should autofill company name on valid INN blur', async () => {
    // Мок ответа от check-inn
    ($api.post as jest.Mock).mockResolvedValue({
      data: { name: 'ООО Тест', address: 'г. Москва' }
    });

    render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    const innInput = screen.getByLabelText(/ИНН/i);
    // Вводим валидный ИНН (10 цифр, алгоритмически верный для теста валидатора)
    // 7736207543 - это ИНН Яндекса
    fireEvent.change(innInput, { target: { value: '7736207543' } });
    fireEvent.blur(innInput);

    await waitFor(() => {
      expect($api.post).toHaveBeenCalledWith('/companies/check-inn', { inn: '7736207543' });
    });

    // Проверяем, что поле названия заполнилось (AntD обновляет значение input)
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Название компании/i) as HTMLInputElement;
      expect(nameInput.value).toBe('ООО Тест');
    });
  });

  it('should show error when server returns 400 (Invalid Checksum)', async () => {
    // Мок ошибки от сервера при регистрации
    ($api.post as jest.Mock).mockRejectedValue({
      response: {
        status: 400,
        data: { message: 'Некорректный ИНН (ошибка валидации)' }
      }
    });

    render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    // Заполняем форму
    fireEvent.change(screen.getByLabelText(/ИНН/i), { target: { value: '7736207543' } });
    fireEvent.change(screen.getByLabelText(/Название компании/i), { target: { value: 'Тест' } });
    fireEvent.change(screen.getByLabelText(/ФИО/i), { target: { value: 'Иван' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@mail.ru' } });
    fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: '123456' } });

    // Сабмит
    fireEvent.click(screen.getByText('Зарегистрироваться'));

    // Ожидаем появления ошибки
    await waitFor(() => {
      expect(screen.getByText('Некорректный ИНН (ошибка валидации)')).toBeInTheDocument();
    });
  });
});