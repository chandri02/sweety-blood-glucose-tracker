import apiClient from './client';

export async function getReadings(params = {}) {
  const res = await apiClient.get('/readings', { params });
  return res.data;
}

export async function getReadingById(id) {
  const res = await apiClient.get(`/readings/${id}`);
  return res.data;
}

export async function createReading(readingData) {
  const res = await apiClient.post('/readings', readingData);
  return res.data;
}

export async function updateReading(id, readingData) {
  const res = await apiClient.put(`/readings/${id}`, readingData);
  return res.data;
}

export async function deleteReading(id) {
  const res = await apiClient.delete(`/readings/${id}`);
  return res.data;
}
