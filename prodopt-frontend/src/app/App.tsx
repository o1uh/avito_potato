import './styles/index.css';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { RouterProvider } from './providers/RouterProvider';
import { SocketProvider } from './providers/SocketProvider';
// Импортируем interceptors, чтобы они применились при старте
import '@/shared/api/interceptors'; 

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <SocketProvider>
           <RouterProvider />
        </SocketProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;