import './styles/index.css';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { RouterProvider } from './providers/RouterProvider';
import { SocketProvider } from './providers/SocketProvider';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import '@/shared/api/interceptors'; 

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <SocketProvider>
             <RouterProvider />
          </SocketProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;