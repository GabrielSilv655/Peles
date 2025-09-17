import axios from "axios";

const base_url = process.env.REACT_APP_API_DEVELOPMENT || (
  process.env.NODE_ENV === "development" 
    ? "http://localhost:5000/api" // Local backend URL
    : "https://sisa-project.up.railway.app/api" // Ensure /api prefix in production
);

// Log base URL selected (helps diagnose frontend-backend connectivity)
if (typeof window !== 'undefined') {
  console.log('[CONNECTIVITY] NODE_ENV=', process.env.NODE_ENV);
  console.log('[CONNECTIVITY] API baseURL set to:', base_url);
  if (process.env.NODE_ENV === 'production' && !base_url.includes('/api')) {
    console.warn('[CONNECTIVITY] Warning: baseURL in production does not include /api. This may cause 404s if backend expects /api prefix.');
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
  // Auto-run on load in production to surface issues early
  if (process.env.NODE_ENV === 'production') {
    testConnectivity();
  }
}

export default API;
