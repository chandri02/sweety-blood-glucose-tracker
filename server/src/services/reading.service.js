const readingRepository = require('../repositories/reading.repository');

class ReadingError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function createReading({ userId, readingDate, timeSlot, glucoseValue }) {
  return await readingRepository.createReading({
    userId,
    readingDate,
    timeSlot,
    glucoseValue,
  });
}

async function getReadings({ userId, page, limit, startDate, endDate, timeSlot }) {
  return await readingRepository.findReadings({
    userId,
    page,
    limit,
    startDate,
    endDate,
    timeSlot,
  });
}

async function getReadingById({ id, userId }) {
  const reading = await readingRepository.findReadingById({ id, userId });
  if (!reading) {
    throw new ReadingError('Reading not found', 404, 'NOT_FOUND');
  }
  return reading;
}

async function updateReading({ id, userId, readingDate, timeSlot, glucoseValue }) {
  const updated = await readingRepository.updateReading({
    id,
    userId,
    readingDate,
    timeSlot,
    glucoseValue,
  });

  if (!updated) {
    throw new ReadingError('Reading not found', 404, 'NOT_FOUND');
  }

  return updated;
}

async function deleteReading({ id, userId }) {
  const deletedId = await readingRepository.deleteReading({ id, userId });
  if (!deletedId) {
    throw new ReadingError('Reading not found', 404, 'NOT_FOUND');
  }
  return { id: deletedId };
}

module.exports = {
  ReadingError,
  createReading,
  getReadings,
  getReadingById,
  updateReading,
  deleteReading,
};
