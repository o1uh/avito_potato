import { ConfigProvider } from 'antd';
import { ReactNode } from 'react';
import ruRU from 'antd/locale/ru_RU';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};