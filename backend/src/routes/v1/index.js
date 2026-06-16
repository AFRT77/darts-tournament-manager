const express = require('express');
const authRoutes = require('./auth.routes');
const playersRoutes = require('./players.routes');
const tournamentsRoutes = require('./tournaments.routes');
const matchesRoutes = require('./matches.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Darts Tournament Manager API v1',
      version: 'v1',
      docs: '/docs',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        players: '/api/v1/players',
        users: '/api/v1/users',
        tournaments: '/api/v1/tournaments',
        matches: '/api/v1/matches',
        stats: '/api/v1/stats',
      },
    },
    meta: null,
    error: null,
  });
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: 'v1',
      timestamp: new Date().toISOString(),
    },
    meta: null,
    error: null,
  });
});

router.use('/auth', authRoutes);
router.use('/users', require('./users.routes'));
router.use('/players', playersRoutes);
router.use('/tournaments', tournamentsRoutes);
router.use('/matches', matchesRoutes);
router.use('/stats', require('./stats.routes'));

module.exports = router;
