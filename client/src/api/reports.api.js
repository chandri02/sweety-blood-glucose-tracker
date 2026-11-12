import apiClient from './client';

export async function getDailyReport(date) {
  const params = date ? { date } : {};
  const res = await apiClient.get('/reports/daily', { params });
  return res.data;
}

export async function getMonthToDateReport(date) {
  const params = date ? { date } : {};
  const res = await apiClient.get('/reports/month-to-date', { params });
  return res.data;
}

export async function getMonthlyReport(year, month) {
  const params = { year, month };
  const res = await apiClient.get('/reports/monthly', { params });
  return res.data;
}

export async function getCustomReport(startDate, endDate) {
  const params = { startDate, endDate };
  const res = await apiClient.get('/reports/custom', { params });
  return res.data;
}
