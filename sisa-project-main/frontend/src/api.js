import axios from "axios";

const base_url = process.env.NODE_ENV === "development" 
  ? "http://localhost:5000" // Alterado para HTTP
  : "https://sisa.up.railway.app:8080"; // Updated production URL

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
    // Adicione um log mais detalhado do erro
    console.error('Erro na requisição:', {
      config: error.config,
      response: error.response,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default API;
