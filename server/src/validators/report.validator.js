const { getTodayString } = require('./reading.validator');
const { MAX_CUSTOM_RANGE_DAYS } = require('../constants/report.constants');

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidCalendarDate(dateStr) {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function daysBetween(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getLastDayOfMonth(year, month) {
  // day 0 of month + 1 gives the last day of month
  const lastDate = new Date(year, month, 0);
  const day = String(lastDate.getDate()).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-${day}`;
}

function validateDailyReportQuery(req, res, next) {
  let { date } = req.query;
  const today = getTodayString();

  if (!date) {
    req.query.date = today;
    return next();
  }

  const trimmed = date.trim();
  if (!isValidCalendarDate(trimmed)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid date parameter. Must be a valid calendar date in YYYY-MM-DD format.',
      },
    });
  }

  if (trimmed > today) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Report date cannot be in the future.',
      },
    });
  }

  req.query.date = trimmed;
  next();
}

function validateMonthToDateReportQuery(req, res, next) {
  let { date } = req.query;
  const today = getTodayString();

  let targetDate = today;
  if (date) {
    const trimmed = date.trim();
    if (!isValidCalendarDate(trimmed)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid date parameter. Must be a valid calendar date in YYYY-MM-DD format.',
        },
      });
    }
    if (trimmed > today) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Report date cannot be in the future.',
        },
      });
    }
    targetDate = trimmed;
  }

  const [year, month] = targetDate.split('-');
  const startDate = `${year}-${month}-01`;
  const endDate = targetDate;

  req.reportRange = {
    startDate,
    endDate,
    referenceDate: targetDate,
  };

  next();
}

function validateMonthlyReportQuery(req, res, next) {
  let { year, month } = req.query;
  const today = getTodayString();
  const [currentYearStr, currentMonthStr] = today.split('-');
  const currentYear = parseInt(currentYearStr, 10);
  const currentMonth = parseInt(currentMonthStr, 10);

  let parsedYear;
  let parsedMonth;

  if (month && typeof month === 'string' && MONTH_REGEX.test(month.trim())) {
    const [y, m] = month.trim().split('-').map(Number);
    parsedYear = y;
    parsedMonth = m;
  } else {
    parsedYear = year ? parseInt(year, 10) : currentYear;
    parsedMonth = month ? parseInt(month, 10) : currentMonth;
  }

  if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid year. Must be a four-digit year between 2000 and 2100.',
      },
    });
  }

  if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid month. Must be an integer between 1 and 12.',
      },
    });
  }

  // Future check: month cannot be in the future
  if (parsedYear > currentYear || (parsedYear === currentYear && parsedMonth > currentMonth)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Monthly report cannot be generated for a future month.',
      },
    });
  }

  const mm = String(parsedMonth).padStart(2, '0');
  const startDate = `${parsedYear}-${mm}-01`;
  const endDate = getLastDayOfMonth(parsedYear, parsedMonth);

  req.reportRange = {
    year: parsedYear,
    month: parsedMonth,
    startDate,
    endDate,
  };

  next();
}

function validateCustomReportQuery(req, res, next) {
  const { startDate, endDate } = req.query;
  const today = getTodayString();

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Both startDate and endDate are required in YYYY-MM-DD format.',
      },
    });
  }

  const startTrimmed = startDate.trim();
  const endTrimmed = endDate.trim();

  if (!isValidCalendarDate(startTrimmed)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'startDate must be a valid calendar date in YYYY-MM-DD format.',
      },
    });
  }

  if (!isValidCalendarDate(endTrimmed)) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'endDate must be a valid calendar date in YYYY-MM-DD format.',
      },
    });
  }

  if (startTrimmed > endTrimmed) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'startDate cannot be after endDate.',
      },
    });
  }

  if (endTrimmed > today) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Report date range cannot be in the future.',
      },
    });
  }

  const dayDiff = daysBetween(startTrimmed, endTrimmed);
  if (dayDiff > MAX_CUSTOM_RANGE_DAYS) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Custom report range cannot exceed ${MAX_CUSTOM_RANGE_DAYS} days.`,
      },
    });
  }

  req.reportRange = {
    startDate: startTrimmed,
    endDate: endTrimmed,
  };

  next();
}

module.exports = {
  validateDailyReportQuery,
  validateMonthToDateReportQuery,
  validateMonthlyReportQuery,
  validateCustomReportQuery,
};
