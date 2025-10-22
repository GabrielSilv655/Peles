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

// Segunda verificação: origem do frontend e classificação da URL da API
(() => {
  try {
    const baseURL = API.defaults.baseURL || '';
    const frontendOrigin = window.location.origin;
    const hostname = window.location.hostname;

    const isApiLocal = /localhost|127\.0\.0\.1|^http:\/\/10\.|^http:\/\/192\.168\./.test(baseURL);

    console.log('[SISA] Frontend origin:', frontendOrigin);
    console.log('[SISA] Frontend hostname:', hostname);
    console.log('[SISA] API baseURL check:', { baseURL, isApiLocal, isRailway: /railway\.app/.test(baseURL) });

    if (isApiLocal) {
      console.warn('[SISA] ALERTA: API baseURL aponta para ambiente local. Em produção isso indica configuração incorreta.');
    } else if (/railway\.app/.test(baseURL)) {
      console.log('[SISA] API baseURL aponta para Railway (OK).');
    }

    // Tenta obter informações de diagnóstico do backend (se existir)
    API.get('/diagnostics')
      .then((r) => {
        console.log('[SISA] Diagnostics do backend:', r.data);
      })
      .catch((e) => {
        const status = e?.response?.status;
        if (status === 404) {
          console.warn('[SISA] Endpoint /api/diagnostics não existe no backend. Recomendado criar para verificação bidirecional.');
        } else {
          console.warn('[SISA] Falha ao obter /api/diagnostics', { status, data: e?.response?.data, message: e?.message });
        }
      });
  } catch (e) {
    console.error('[SISA] Erro na verificação extra do frontend:', e);
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
