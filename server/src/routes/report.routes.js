const express = require('express');
const reportController = require('../controllers/report.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  validateDailyReportQuery,
  validateMonthToDateReportQuery,
  validateMonthlyReportQuery,
  validateCustomReportQuery,
} = require('../validators/report.validator');

const router = express.Router();

// All reports require authentication
router.use(requireAuth);

router.get('/daily', validateDailyReportQuery, reportController.getDailyReport);
router.get('/month-to-date', validateMonthToDateReportQuery, reportController.getMonthToDateReport);
router.get('/monthly', validateMonthlyReportQuery, reportController.getMonthlyReport);
router.get('/custom', validateCustomReportQuery, reportController.getCustomReport);

module.exports = router;
