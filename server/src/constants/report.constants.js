const REPORT_TYPES = {
  DAILY: 'daily',
  MONTH_TO_DATE: 'month-to-date',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
};

const MAX_CUSTOM_RANGE_DAYS = 366; // Maximum 1 year for custom range to avoid excessive payload

module.exports = {
  REPORT_TYPES,
  MAX_CUSTOM_RANGE_DAYS,
};
