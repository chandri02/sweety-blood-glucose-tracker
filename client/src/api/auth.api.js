import apiClient, { fetchCsrfToken } from './client';

export async function login({ email, password }) {
  // Ensure fresh CSRF token before login
  await fetchCsrfToken();
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data;
}

export async function logout() {
  const res = await apiClient.post('/auth/logout');
  return res.data;
}

export async function getCurrentUser() {
  const res = await apiClient.get('/auth/me');
  return res.data.user;
}
