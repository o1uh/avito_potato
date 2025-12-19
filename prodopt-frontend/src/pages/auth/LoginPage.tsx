import { LoginForm } from '@/features/auth/LoginForm';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';

export const LoginPage = () => {
  return (
    // Фон страницы светло-серый (bg-gray-50)
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      {/* Окно: белое, с серой рамкой (border-gray-200) и мягкой тенью */}
      <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl w-[380px]">
        
        {/* Заголовок с зеленым акцентом */}
        <h2 className="text-center mb-6 text-2xl font-semibold text-gray-800">
          Вход в <span className="text-primary">ProdOpt</span>
        </h2>
        
        <LoginForm />
        
        <div className="mt-6 text-center text-sm text-gray-500">
          Нет аккаунта?{' '}
          <Link to={ROUTES.REGISTER} className="font-medium text-primary hover:text-primary-hover">
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
};