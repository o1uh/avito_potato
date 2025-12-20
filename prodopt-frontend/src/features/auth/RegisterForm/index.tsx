import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { authApi } from '@/entities/session/api/auth.api';
import { $api } from '@/shared/api/base';
import { useSessionStore } from '@/entities/session/model/store';
import { ROUTES } from '@/shared/config/routes';
import { validateInn } from '@/shared/lib/validators';
import { useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const setTokens = useSessionStore((state) => state.setTokens);
  const setUser = useSessionStore((state) => state.setUser);

  const [isLoadingInn, setIsLoadingInn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInnBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const inn = e.target.value;
    
    // Если ИНН пустой или короткий — ничего не делаем
    if (!inn || inn.length < 10) return;

    if (validateInn(inn)) {
      setIsLoadingInn(true);
      try {
        const response = await $api.post('/companies/check-inn', { inn });
        const companyData = response.data;
        
        form.setFieldsValue({
          companyName: companyData.name,
        });
        
        message.success('Данные компании найдены и заполнены');
      } catch (error: any) {
        // Если бэкенд вернул 404 (Не найдено) или любую другую ошибку
        const errorMsg = error.response?.status === 404 
          ? 'Организация не найдена в базе.' 
          : 'Не удалось загрузить данные автоматически.';
          
        message.warning(`${errorMsg} Пожалуйста, заполните название вручную.`);
        
        // Опционально: фокусируемся на поле названия, чтобы пользователю было удобно печатать
        form.getFieldInstance('companyName')?.focus();
      } finally {
        setIsLoadingInn(false); // Снимаем блокировку в любом случае
      }
    }
  };

  const onFinish = async (values: any) => {
    setIsSubmitting(true);
    try {
      const tokens = await authApi.register(values);
      setTokens(tokens.accessToken, tokens.refreshToken);
      
      const userProfile = await authApi.getProfile();
      setUser(userProfile);
      
      message.success('Регистрация завершена');
      navigate(ROUTES.HOME);
    } catch (error: any) {
      setIsSubmitting(false);
      
      if (error.response?.status === 400) {
        const errorMsg = error.response.data.message;
        // Приводим к нижнему регистру для надежности проверки
        const lowerMsg = String(errorMsg).toLowerCase();

        // Логика распределения ошибок по полям
        if (lowerMsg.includes('email')) {
           // Если в тексте есть "email" -> подсвечиваем поле Email
           form.setFields([{ name: 'email', errors: [errorMsg] }]);
        } else if (lowerMsg.includes('inn') || lowerMsg.includes('инн')) {
           // Если в тексте есть "inn" или "инн" -> подсвечиваем поле ИНН
           form.setFields([{ name: 'inn', errors: [errorMsg] }]);
        } else {
           // Иначе показываем всплывающее сообщение
           message.error(errorMsg || 'Ошибка валидации');
        }
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
        <Input 
        placeholder="10 или 12 цифр" 
        onBlur={handleInnBlur} 
        // Добавляем иконку загрузки справа, если идет запрос
        suffix={isLoadingInn ? <LoadingOutlined style={{ color: '#10B981' }} /> : null}
        disabled={isLoadingInn || isSubmitting} // Блокируем само поле
        />
      </Form.Item>
      <Form.Item label="Название компании" name="companyName" rules={[{ required: true }]}>
        <Input disabled={isLoadingInn || isSubmitting} />
      </Form.Item>
      
      <hr className="my-4" />
      <h3>Личные данные</h3>
      <Form.Item label="ФИО" name="fullName" rules={[{ required: true }]}>
        <Input placeholder="Иванов Иван Иванович" disabled={isSubmitting} />
      </Form.Item>
      <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
        <Input disabled={isSubmitting}/>
      </Form.Item>
      <Form.Item label="Пароль" name="password" rules={[{ required: true, min: 6 }]}>
        <Input.Password disabled={isSubmitting}/>
      </Form.Item>
      <Button type="primary" htmlType="submit" block size="large" loading={isLoadingInn || isSubmitting} >Зарегистрироваться</Button>
    </Form>
  );
};