import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import App from '@/App';
import { ThemeProvider } from '@/store/theme/ThemeProvider';
import { SavedPortfoliosProvider } from '@/store/savedPortfolios/SavedPortfoliosProvider';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Không tìm thấy phần tử #root');

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <SavedPortfoliosProvider>
        <App />
      </SavedPortfoliosProvider>
    </ThemeProvider>
  </StrictMode>
);
