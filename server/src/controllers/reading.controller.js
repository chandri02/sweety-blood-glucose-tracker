const readingService = require('../services/reading.service');

async function createReading(req, res, next) {
  try {
    const { reading_date, time_slot, glucose_value } = req.body;
    const reading = await readingService.createReading({
      userId: req.user.id,
      readingDate: reading_date,
      timeSlot: time_slot,
      glucoseValue: glucose_value,
    });

    res.status(201).json({
      message: 'Reading recorded successfully',
      reading,
    });
  } catch (error) {
    next(error);
  }
}

async function getReadings(req, res, next) {
  try {
    const { page, limit, startDate, endDate, timeSlot } = req.query;
    const result = await readingService.getReadings({
      userId: req.user.id,
      page,
      limit,
      startDate,
      endDate,
      timeSlot,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getReadingById(req, res, next) {
  try {
    const { id } = req.params;
    const reading = await readingService.getReadingById({
      id,
      userId: req.user.id,
    });

    res.status(200).json({
      reading,
    });
  } catch (error) {
    next(error);
  }
}

async function updateReading(req, res, next) {
  try {
    const { id } = req.params;
    const { reading_date, time_slot, glucose_value } = req.body;
    const reading = await readingService.updateReading({
      id,
      userId: req.user.id,
      readingDate: reading_date,
      timeSlot: time_slot,
      glucoseValue: glucose_value,
    });

    res.status(200).json({
      message: 'Reading updated successfully',
      reading,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteReading(req, res, next) {
  try {
    const { id } = req.params;
    await readingService.deleteReading({
      id,
      userId: req.user.id,
    });

    res.status(200).json({
      message: 'Reading deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
};
