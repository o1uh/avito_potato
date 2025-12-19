import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { authApi } from '@/entities/session/api/auth.api';
import { useSessionStore } from '@/entities/session/model/store';
import { ROUTES } from '@/shared/config/routes';

export const LoginForm = () => {
  const navigate = useNavigate();
  const setTokens = useSessionStore((state) => state.setTokens);
  const setUser = useSessionStore((state) => state.setUser);
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    try {
      const tokens = await authApi.login(values);
      setTokens(tokens.accessToken, tokens.refreshToken);
      
      const userProfile = await authApi.getProfile();
      setUser(userProfile);
      
      message.success('Успешный вход');
      navigate(ROUTES.HOME);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка входа');
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ width: 300 }}>
      <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
        <Input placeholder="example@mail.com" />
      </Form.Item>
      <Form.Item label="Пароль" name="password" rules={[{ required: true }]}>
        <Input.Password placeholder="******" />
      </Form.Item>
      <Button type="primary" htmlType="submit" block>Войти</Button>
    </Form>
  );
};