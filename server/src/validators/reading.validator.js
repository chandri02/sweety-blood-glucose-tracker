const {
  TIME_SLOTS,
  MIN_GLUCOSE_VALUE,
  MAX_GLUCOSE_VALUE,
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} = require('../constants/reading.constants');

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getTodayString(timeZone = process.env.APP_TIMEZONE) {
  try {
    if (timeZone) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    }
  } catch {
    // Fall back to system local date if invalid timezone identifier provided
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

function validateReadingDate(readingDate) {
  if (!readingDate || typeof readingDate !== 'string') {
    return 'Reading date is required and must be in YYYY-MM-DD format';
  }
  const trimmed = readingDate.trim();
  if (!isValidCalendarDate(trimmed)) {
    return 'Reading date must be a valid calendar date in YYYY-MM-DD format';
  }
  const today = getTodayString();
  if (trimmed > today) {
    return 'Reading date cannot be in the future';
  }
  return null;
}

function validateTimeSlot(timeSlot) {
  if (!timeSlot || typeof timeSlot !== 'string') {
    return `Time slot is required. Must be one of: ${TIME_SLOTS.join(', ')}`;
  }
  const trimmed = timeSlot.trim();
  if (!TIME_SLOTS.includes(trimmed)) {
    return `Invalid time slot '${trimmed}'. Must be one of: ${TIME_SLOTS.join(', ')}`;
  }
  return null;
}

function validateGlucoseValue(glucoseValue) {
  if (glucoseValue === undefined || glucoseValue === null || glucoseValue === '') {
    return 'Glucose value is required';
  }
  const num = Number(glucoseValue);
  if (!Number.isInteger(num)) {
    return 'Glucose value must be a whole integer';
  }
  if (num < MIN_GLUCOSE_VALUE || num > MAX_GLUCOSE_VALUE) {
    return `Glucose value must be between ${MIN_GLUCOSE_VALUE} and ${MAX_GLUCOSE_VALUE} mg/dL`;
  }
  return null;
}

function validateReadingId(req, res, next) {
  const { id } = req.params;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'Reading ID must be a valid UUID',
      },
    });
  }
  next();
}

function validateCreateReading(req, res, next) {
  const errors = {};
  const { reading_date, time_slot, glucose_value } = req.body;

  const dateError = validateReadingDate(reading_date);
  if (dateError) errors.reading_date = dateError;

  const slotError = validateTimeSlot(time_slot);
  if (slotError) errors.time_slot = slotError;

  const valueError = validateGlucoseValue(glucose_value);
  if (valueError) errors.glucose_value = valueError;

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid reading data provided',
        details: errors,
      },
    });
  }

  // Normalize sanitized values onto req.body
  req.body.reading_date = reading_date.trim();
  req.body.time_slot = time_slot.trim();
  req.body.glucose_value = Number(glucose_value);

  next();
}

function validateUpdateReading(req, res, next) {
  const errors = {};
  const { reading_date, time_slot, glucose_value } = req.body;

  const dateError = validateReadingDate(reading_date);
  if (dateError) errors.reading_date = dateError;

  const slotError = validateTimeSlot(time_slot);
  if (slotError) errors.time_slot = slotError;

  const valueError = validateGlucoseValue(glucose_value);
  if (valueError) errors.glucose_value = valueError;

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid reading data provided for update',
        details: errors,
      },
    });
  }

  req.body.reading_date = reading_date.trim();
  req.body.time_slot = time_slot.trim();
  req.body.glucose_value = Number(glucose_value);

  next();
}

function validateQueryReadings(req, res, next) {
  const errors = {};
  let { page, limit, startDate, endDate, timeSlot } = req.query;

  let parsedPage = DEFAULT_PAGE;
  if (page !== undefined) {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1) {
      errors.page = 'Page must be a positive integer greater than or equal to 1';
    } else {
      parsedPage = p;
    }
  }

  let parsedLimit = DEFAULT_PAGE_LIMIT;
  if (limit !== undefined) {
    const l = Number(limit);
    if (!Number.isInteger(l) || l < 1 || l > MAX_PAGE_LIMIT) {
      errors.limit = `Limit must be an integer between 1 and ${MAX_PAGE_LIMIT}`;
    } else {
      parsedLimit = l;
    }
  }

  if (startDate !== undefined) {
    if (!isValidCalendarDate(startDate)) {
      errors.startDate = 'startDate must be a valid calendar date in YYYY-MM-DD format';
    }
  }

  if (endDate !== undefined) {
    if (!isValidCalendarDate(endDate)) {
      errors.endDate = 'endDate must be a valid calendar date in YYYY-MM-DD format';
    }
  }

  if (startDate && endDate && isValidCalendarDate(startDate) && isValidCalendarDate(endDate)) {
    if (startDate > endDate) {
      errors.dateRange = 'startDate cannot be after endDate';
    }
  }

  if (timeSlot !== undefined) {
    if (!TIME_SLOTS.includes(timeSlot)) {
      errors.timeSlot = `Invalid timeSlot filter. Must be one of: ${TIME_SLOTS.join(', ')}`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: errors,
      },
    });
  }

  req.query.page = parsedPage;
  req.query.limit = parsedLimit;

  next();
}

module.exports = {
  validateReadingDate,
  validateTimeSlot,
  validateGlucoseValue,
  validateReadingId,
  validateCreateReading,
  validateUpdateReading,
  validateQueryReadings,
  getTodayString,
};
