import { RegisterForm } from '@/features/auth/RegisterForm';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

export const RegisterPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-10">
      <div className="p-8 bg-white shadow-md rounded-lg">
        <h2 className="text-center mb-6">Регистрация компании</h2>
        <RegisterForm />
        <div className="mt-4 text-center">
          Уже есть аккаунт? <Link to={ROUTES.LOGIN}>Войти</Link>
        </div>
      </div>
    </div>
  );
};