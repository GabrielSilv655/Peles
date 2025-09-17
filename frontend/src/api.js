import axios from "axios";

// Detectar se estamos realmente em produção baseado na URL atual
const isActuallyProduction = typeof window !== 'undefined' && 
  (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

// Prioridade: REACT_APP_API_URL (produção) > REACT_APP_API_DEVELOPMENT (dev) > fallback baseado no hostname
const base_url = process.env.REACT_APP_API_URL || 
                 process.env.REACT_APP_API_DEVELOPMENT || (
  isActuallyProduction
    ? "sisa.up.railway.app" // Production backend fallback
    : "http://localhost:5000/api" // Local development fallback
);

// Log base URL selected (helps diagnose frontend-backend connectivity)
if (typeof window !== 'undefined') {
  console.log('[CONNECTIVITY] NODE_ENV=', process.env.NODE_ENV);
  console.log('[CONNECTIVITY] window.location.hostname=', window.location.hostname);
  console.log('[CONNECTIVITY] isActuallyProduction=', isActuallyProduction);
  console.log('[CONNECTIVITY] REACT_APP_API_URL=', process.env.REACT_APP_API_URL);
  console.log('[CONNECTIVITY] REACT_APP_API_DEVELOPMENT=', process.env.REACT_APP_API_DEVELOPMENT);
  console.log('[CONNECTIVITY] API baseURL set to:', base_url);
  
  if (isActuallyProduction && base_url.includes('localhost')) {
    console.error('[CONNECTIVITY] ERRO: Frontend em produção tentando conectar ao localhost!');
    console.error('[CONNECTIVITY] Verifique as variáveis de ambiente REACT_APP_API_URL ou REACT_APP_API_DEVELOPMENT');
  }
}

const API = axios.create({
  baseURL: base_url,
  headers: {
    'Content-Type': 'application/json'
  }
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API_ERROR] Erro na requisição:', error?.message || error);
    console.error('[API_ERROR] BaseURL:', API.defaults.baseURL);
    console.error('[API_ERROR] Full URL:', (error?.config?.baseURL || '') + (error?.config?.url || ''));
    console.error('[API_ERROR] Method:', error.config?.method);
    console.error('[API_ERROR] Status:', error.response?.status);
    console.error('[API_ERROR] Data:', error.response?.data);
    return Promise.reject(error);
  }
);

// Simple connectivity test helper: tries health endpoints and logs results
export async function testConnectivity() {
  const endpoints = [
    '/healthz',
    '/test',
    ''
  ];

  console.log('[CONNECTIVITY] Iniciando teste... baseURL=', API.defaults.baseURL);
  for (const ep of endpoints) {
    try {
      const res = await API.get(`/` + ep.replace(/^\//, ''));
      console.log(`[CONNECTIVITY] GET ${API.defaults.baseURL}/${ep} ->`, res.status, res.data);
    } catch (e) {
      console.warn(`[CONNECTIVITY] GET ${API.defaults.baseURL}/${ep} falhou:`, e?.response?.status, e?.message, e?.response?.data);
    }
  }
}

// Attach to window for manual triggering from DevTools
if (typeof window !== 'undefined') {
  window.__SISA_TEST_CONNECTIVITY__ = testConnectivity;
  // Auto-run on load when actually in production to surface issues early
  if (isActuallyProduction) {
    testConnectivity();
  }
}

export default API;
