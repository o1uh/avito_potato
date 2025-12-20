import { ConfigProvider } from 'antd';
import { ReactNode } from 'react';
import ruRU from 'antd/locale/ru_RU';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          // Основной зеленый цвет бренда
          colorPrimary: '#10B981',
          // Цвет ссылок и активных элементов
          colorLink: '#10B981',
          colorLinkHover: '#059669',
          // Скругление углов (8px - современный стандарт)
          borderRadius: 8,
          // Цвет границ инпутов и карточек по умолчанию
          colorBorder: '#E5E7EB', // Gray-200
        },
        components: {
          Button: {
            // Делаем кнопки чуть более "плоскими" и приятными
            primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.02)',
          },
          Input: {
            // При фокусе обводка будет зеленой
            activeBorderColor: '#10B981',
            hoverBorderColor: '#34D399',
          },
          Card: {
            // Настройка карточек AntD (если используются они)
            colorBorderSecondary: '#E5E7EB',
          }
        }
      }}
    >
      {children}
    </ConfigProvider>
  );
};