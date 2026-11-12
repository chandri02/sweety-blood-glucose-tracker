const TIME_SLOTS = [
  'Morning fasting',
  'After breakfast',
  'After lunch',
  'After dinner',
];

const MIN_GLUCOSE_VALUE = 40;
const MAX_GLUCOSE_VALUE = 600;
const MAX_READINGS_PER_DAY = 4;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

module.exports = {
  TIME_SLOTS,
  MIN_GLUCOSE_VALUE,
  MAX_GLUCOSE_VALUE,
  MAX_READINGS_PER_DAY,
  DEFAULT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
};
