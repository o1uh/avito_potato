import { LoginForm } from '@/features/auth/LoginForm';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

export const LoginPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white shadow-md rounded-lg">
        <h2 className="text-center mb-6">Вход в ProdOpt</h2>
        <LoginForm />
        <div className="mt-4 text-center">
          Нет аккаунта? <Link to={ROUTES.REGISTER}>Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
};