const express = require('express');
const readingController = require('../controllers/reading.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  validateReadingId,
  validateCreateReading,
  validateUpdateReading,
  validateQueryReadings,
} = require('../validators/reading.validator');

const router = express.Router();

// All reading routes require valid user session
router.use(requireAuth);

router.post('/', validateCreateReading, readingController.createReading);
router.get('/', validateQueryReadings, readingController.getReadings);
router.get('/:id', validateReadingId, readingController.getReadingById);
router.put('/:id', validateReadingId, validateUpdateReading, readingController.updateReading);
router.delete('/:id', validateReadingId, readingController.deleteReading);

module.exports = router;
