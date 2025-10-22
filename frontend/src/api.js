import axios from "axios";

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.endsWith('.local')
);

const base_url =
  process.env.REACT_APP_API_BASE_URL ||
  (!isLocalhost
    ? (process.env.REACT_APP_API_PRODUCTION || "https://sisa.up.railway.app/api") // Production backend URL (HTTPS)
    : (process.env.REACT_APP_API_DEVELOPMENT || "http://localhost:5000/api")); // Local backend URL
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
    console.error('Erro na requisição:', error);
    console.error('URL:', error.config?.url);
    console.error('Method:', error.config?.method);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    return Promise.reject(error);
  }
);

export default API;
