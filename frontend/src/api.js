import axios from "axios";

const base_url = process.env.REACT_APP_API_DEVELOPMENT || (
  process.env.NODE_ENV === "development" 
    ? "https://sisa.up.railway.app/api" // Local backend URL
    : "" // Correct backend URL with HTTPS and /api path
);

// Log da configuração inicial
console.log('🔧 CONFIGURAÇÃO DA API:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_DEVELOPMENT:', process.env.REACT_APP_API_DEVELOPMENT);
console.log('Base URL escolhida:', base_url);

const API = axios.create({
  baseURL: base_url,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Teste de conexão inicial
API.get('/test')
  .then(response => {
    console.log('✅ CONEXÃO COM BACKEND ESTABELECIDA!');
    console.log('Resposta do teste:', response.data);
  })
  .catch(error => {
    console.log('❌ FALHA NA CONEXÃO COM BACKEND');
    console.log('URL tentada:', base_url + '/test');
    console.log('Erro:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  });

API.interceptors.request.use((config) => {
  console.log(`🚀 REQUISIÇÃO: ${config.method?.toUpperCase()} ${config.url}`);
  console.log('URL completa:', config.baseURL + config.url);
  
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Token adicionado à requisição');
  }
  return config;
});

API.interceptors.response.use(
  (response) => {
    console.log(`✅ SUCESSO: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    console.log('Status:', response.status);
    return response;
  },
  (error) => {
    console.log(`❌ ERRO: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error('Detalhes do erro:', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      response: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default API;
