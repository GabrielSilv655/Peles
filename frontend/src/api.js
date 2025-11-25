import axios from "axios";

// Prefer a single env var to override the full API base URL
const ENV_BASE = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_DEVELOPMENT;

// Determine base URL by environment with safe defaults
const base_url = ENV_BASE || (
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000/api" // Local backend URL (adjust if backend binds a different port)
    : "https://sisa-project.up.railway.app/api" // Production backend URL must include /api
);

if (process.env.NODE_ENV === "development") {
  // Lightweight debug to confirm which base URL is used in dev
  // eslint-disable-next-line no-console
  console.log("[API] baseURL:", base_url);
}

const API = axios.create({
  baseURL: base_url,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.error('Erro na requisição:', error);
    // eslint-disable-next-line no-console
    console.error('URL:', error.config?.url);
    // eslint-disable-next-line no-console
    console.error('Method:', error.config?.method);
    // eslint-disable-next-line no-console
    console.error('Status:', error.response?.status);
    // eslint-disable-next-line no-console
    console.error('Data:', error.response?.data);
    return Promise.reject(error);
  }
);

export default API;
