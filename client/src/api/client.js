import axios from 'axios';

let csrfTokenCache = null;

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setCsrfToken(token) {
  csrfTokenCache = token;
}

export async function fetchCsrfToken() {
  try {
    const res = await axios.get('/api/auth/csrf-token', { withCredentials: true });
    csrfTokenCache = res.data.csrfToken;
    return csrfTokenCache;
  } catch (err) {
    console.warn('Failed to fetch CSRF token:', err);
    return null;
  }
}

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method || '').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!csrfTokenCache) {
      await fetchCsrfToken();
    }
    if (csrfTokenCache) {
      config.headers['X-CSRF-Token'] = csrfTokenCache;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response?.data?.csrfToken) {
      csrfTokenCache = response.data.csrfToken;
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
