import { RegisterForm } from '@/features/auth/RegisterForm';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

export const RegisterPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-10">
      <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl w-[480px]">
        <h2 className="text-center mb-6 text-2xl font-semibold text-gray-800">
          Регистрация в <span className="text-primary">ProdOpt</span>
        </h2>
        
        <RegisterForm />
        
        <div className="mt-6 text-center text-sm text-gray-500">
          Уже есть аккаунт?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:text-primary-hover">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
};