const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      meta: null,
      error: {
        message: 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.',
      },
    });
  },
});

module.exports = {
  apiRateLimiter,
};
