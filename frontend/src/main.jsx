import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import { App } from './App';
import './assets/styles/variables.css';
import './assets/styles/global.css';
import './assets/styles/responsive.css';

createRoot(document.getElementById('root')).render(<App />);
