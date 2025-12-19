import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/entities/session/api/auth.api';
import { useSessionStore } from '@/entities/session/model/store';
import { ROUTES } from '@/shared/config/routes';

export const LogoutButton = () => {
  const navigate = useNavigate();
  const logout = useSessionStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <Button onClick={handleLogout} danger>Выйти</Button>
  );
};