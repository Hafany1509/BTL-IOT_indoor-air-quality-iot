import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { AuthProvider } from './context/AuthContext';
import { AppRouter } from './routes/AppRouter';
export function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><AppRouter /></ToastProvider></AuthProvider></BrowserRouter>;
}
