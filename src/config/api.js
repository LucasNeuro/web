const axios = require('axios');
require('dotenv').config();

const apiClient = axios.create({
  baseURL: process.env.PNCP_API_BASE_URL || 'https://pncp.gov.br/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Interceptor para logging de requisicoes
apiClient.interceptors.request.use(
  config => {
    const method = config.method.toUpperCase();
    const url = config.url;
    console.log(`[REQUEST] ${method} ${url}`);
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
apiClient.interceptors.response.use(
  response => {
    console.log(`[RESPONSE] Status ${response.status} - OK`);
    return response;
  },
  error => {
    const status = error.response?.status || 'UNKNOWN';
    const message = error.message || 'Erro desconhecido';
    console.error(`[ERROR] Status ${status} - ${message}`);
    return Promise.reject(error);
  }
);

module.exports = apiClient;

