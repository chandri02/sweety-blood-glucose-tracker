const reportService = require('../services/report.service');

async function getDailyReport(req, res, next) {
  try {
    const { date } = req.query;
    const report = await reportService.getDailyReport({
      userId: req.user.id,
      date,
    });
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
}

async function getMonthToDateReport(req, res, next) {
  try {
    const { startDate, endDate, referenceDate } = req.reportRange;
    const report = await reportService.getMonthToDateReport({
      userId: req.user.id,
      startDate,
      endDate,
      referenceDate,
    });
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
}

async function getMonthlyReport(req, res, next) {
  try {
    const { year, month, startDate, endDate } = req.reportRange;
    const report = await reportService.getMonthlyReport({
      userId: req.user.id,
      year,
      month,
      startDate,
      endDate,
    });
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
}

async function getCustomReport(req, res, next) {
  try {
    const { startDate, endDate } = req.reportRange;
    const report = await reportService.getCustomReport({
      userId: req.user.id,
      startDate,
      endDate,
    });
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
  getCustomReport,
};
