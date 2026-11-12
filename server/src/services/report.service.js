const reportRepository = require('../repositories/report.repository');
const { REPORT_TYPES } = require('../constants/report.constants');

async function getDailyReport({ userId, date }) {
  const data = await reportRepository.getDailyReportData({ userId, date });
  return {
    reportType: REPORT_TYPES.DAILY,
    ...data,
  };
}

async function getMonthToDateReport({ userId, startDate, endDate, referenceDate }) {
  const data = await reportRepository.getRangeReportData({ userId, startDate, endDate });
  return {
    reportType: REPORT_TYPES.MONTH_TO_DATE,
    referenceDate,
    ...data,
  };
}

async function getMonthlyReport({ userId, year, month, startDate, endDate }) {
  const data = await reportRepository.getRangeReportData({ userId, startDate, endDate });
  return {
    reportType: REPORT_TYPES.MONTHLY,
    year,
    month,
    ...data,
  };
}

async function getCustomReport({ userId, startDate, endDate }) {
  const data = await reportRepository.getRangeReportData({ userId, startDate, endDate });
  return {
    reportType: REPORT_TYPES.CUSTOM,
    ...data,
  };
}

module.exports = {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
  getCustomReport,
};
