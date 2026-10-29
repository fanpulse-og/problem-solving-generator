import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import '@fontsource/stix-two-text/400.css';
import '@fontsource/stix-two-text/600.css';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import './styles/app.css';
import './styles/print.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
