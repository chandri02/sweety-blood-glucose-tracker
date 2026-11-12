import apiClient, { fetchCsrfToken, setCsrfToken } from './client';

export async function login({ email, password }) {
  // Ensure fresh CSRF token before login
  await fetchCsrfToken();
  const res = await apiClient.post('/auth/login', { email, password });
  if (res.data?.csrfToken) {
    setCsrfToken(res.data.csrfToken);
  }
  return res.data;
}

export async function logout() {
  const res = await apiClient.post('/auth/logout');
  setCsrfToken(null);
  return res.data;
}

export async function getCurrentUser() {
  const res = await apiClient.get('/auth/me');
  return res.data.user;
}
