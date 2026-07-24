import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CVIProvider } from './components/cvi/components/cvi-provider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CVIProvider>
      <App />
    </CVIProvider>
  </StrictMode>
);
