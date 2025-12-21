import { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Result
            status="500"
            title="Что-то пошло не так"
            subTitle="Произошла непредвиденная ошибка в приложении."
            extra={
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={() => window.location.reload()}
              >
                Перезагрузить страницу
              </Button>
            }
          >
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-left max-w-2xl overflow-auto text-red-800 text-xs font-mono">
                    {this.state.error?.toString()}
                </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}