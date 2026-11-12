const express = require('express');
const authController = require('../controllers/auth.controller');
const { validateRegisterPayload, validateLoginPayload } = require('../validators/auth.validator');
const { requireAuth } = require('../middleware/auth.middleware');
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

router.get('/csrf-token', authController.getCsrfToken);
router.post('/register', authLimiter, validateRegisterPayload, authController.register);
router.post('/login', loginLimiter, validateLoginPayload, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
