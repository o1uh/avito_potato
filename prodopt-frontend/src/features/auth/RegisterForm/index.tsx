import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { authApi } from '@/entities/session/api/auth.api';
import { $api } from '@/shared/api/base';
import { useSessionStore } from '@/entities/session/model/store';
import { ROUTES } from '@/shared/config/routes';
import { validateInn } from '@/shared/lib/validators';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const setTokens = useSessionStore((state) => state.setTokens);
  const setUser = useSessionStore((state) => state.setUser);

  const handleInnBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const inn = e.target.value;
    if (inn.length >= 10 && validateInn(inn)) {
      try {
        const response = await $api.post('/companies/check-inn', { inn });
        const companyData = response.data;
        form.setFieldsValue({
          companyName: companyData.name,
        });
        message.info('Данные компании найдены и заполнены');
      } catch (error) {
        // Ошибка DaData не критична для формы
      }
    }
  };

  const onFinish = async (values: any) => {
    try {
      const tokens = await authApi.register(values);
      setTokens(tokens.accessToken, tokens.refreshToken);
      
      const userProfile = await authApi.getProfile();
      setUser(userProfile);
      
      message.success('Регистрация завершена');
      navigate(ROUTES.HOME);
    } catch (error: any) {
      if (error.response?.status === 400) {
        form.setFields([{
          name: 'inn',
          errors: [error.response.data.message]
        }]);
      } else {
        message.error('Ошибка при регистрации');
      }
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} style={{ width: 400 }}>
      <h3>Данные компании</h3>
      <Form.Item 
        label="ИНН" 
        name="inn" 
        rules={[
          { required: true, message: 'Введите ИНН' },
          { validator: (_, value) => validateInn(value) ? Promise.resolve() : Promise.reject('Некорректный ИНН') }
        ]}
      >
        <Input placeholder="10 или 12 цифр" onBlur={handleInnBlur} />
      </Form.Item>
      <Form.Item label="Название компании" name="companyName" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      
      <hr className="my-4" />
      <h3>Личные данные</h3>
      <Form.Item label="ФИО" name="fullName" rules={[{ required: true }]}>
        <Input placeholder="Иванов Иван Иванович" />
      </Form.Item>
      <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Пароль" name="password" rules={[{ required: true, min: 6 }]}>
        <Input.Password />
      </Form.Item>
      <Button type="primary" htmlType="submit" block size="large">Зарегистрироваться</Button>
    </Form>
  );
};