import ReactDOM from "react-dom/client";
import App from "./App";
import { LanguageProvider } from './components/LanguageContext';
import { ThemeProvider } from './components/ThemeContext';

import './styles/global.css';
import API from './api';

// Verificação de conectividade com o backend
(async () => {
  try {
    const baseURL = API.defaults.baseURL;
    console.log('[SISA] API baseURL:', baseURL);
    const resp = await API.get('/test');
    console.log('[SISA] Backend OK', { status: resp.status, data: resp.data });
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error('[SISA] Backend ERRO', { status, data, message: err?.message });
  }
})();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
);   
