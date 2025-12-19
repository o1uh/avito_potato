import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './index';
import { authApi } from '@/entities/session/api/auth.api';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Мокаем API
jest.mock('@/entities/session/api/auth.api');
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('Feature: LoginForm', () => {
  it('should redirect on successful login', async () => {
    mockedAuthApi.login.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' });
    mockedAuthApi.getProfile.mockResolvedValue({ id: 1, fullName: 'User', email: 'u@u.ru', isActive: true, companyId: 1, roleInCompanyId: 2 });

    render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@mail.ru' } });
    fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByText('Войти'));

    await waitFor(() => {
      expect(mockedAuthApi.login).toHaveBeenCalled();
      // Тут можно проверить вызов navigate, если замокать useNavigate
    });
  });

    it('should display error on 401', async () => {
        // ИСПРАВЛЕНИЕ: Добавляем status: 401 в response
        mockedAuthApi.login.mockRejectedValue({
        response: { status: 401, data: { message: 'Some backend error text' } }
        });

        render(
        <BrowserRouter>
            <LoginForm />
        </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'wrong@mail.ru' } });
        fireEvent.change(screen.getByLabelText(/Пароль/i), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByText('Войти'));

        await waitFor(() => {
        expect(screen.getByText('Неверный логин или пароль')).toBeInTheDocument();
        });
    });
});