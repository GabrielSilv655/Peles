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

// Verificação simples de conectividade entre frontend e backend (Railway)
(async function sisaSimpleCheck() {
  try {
    const frontendOrigin = window.location.origin;
    const baseURL = API.defaults.baseURL || '';
    const isFrontendRailway = /railway\.app/.test(frontendOrigin);
    const isBackendRailway = /railway\.app/.test(baseURL);

    console.log('[SISA-SIMPLE] Frontend origin:', frontendOrigin, 'isRailway:', isFrontendRailway);
    console.log('[SISA-SIMPLE] Backend baseURL:', baseURL, 'isRailway:', isBackendRailway);

    const testResp = await API.get('/test');
    const testOk = testResp?.status === 200;

    let echoOk = false;
    try {
      const echoResp = await API.get('/echo');
      echoOk = echoResp?.status === 200 && echoResp?.data?.ok === true;
      console.log('[SISA-SIMPLE] /api/echo:', echoResp?.data);
    } catch (e) {
      if (e?.response?.status === 404) {
        console.warn('[SISA-SIMPLE] /api/echo não existe, seguindo apenas com /api/test.');
      } else {
        console.warn('[SISA-SIMPLE] Falha em /api/echo', { status: e?.response?.status, data: e?.response?.data });
      }
    }

    const connected = testOk || echoOk;
    console.log('[SISA-SIMPLE] Conectado ao backend:', connected);

    if (isFrontendRailway && !isBackendRailway) {
      console.warn('[SISA-SIMPLE] Frontend em Railway, mas API baseURL não é Railway. Verifique REACT_APP_API_BASE_URL.');
    }
  } catch (err) {
    console.error('[SISA-SIMPLE] Falha na verificação simples', { status: err?.response?.status, data: err?.response?.data, message: err?.message });
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
