const express = require('express');
const authController = require('../../controllers/auth.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { loginSchema, registerSchema } = require('../../validators/auth.validator');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', requireAuth, requireRole('admin'), validate(registerSchema), authController.register);
router.post('/refresh', authController.refresh);
router.get('/me', requireAuth, authController.me);

module.exports = router;
