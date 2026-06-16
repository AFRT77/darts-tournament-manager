const express = require('express');
const statsController = require('../../controllers/stats.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { uuidParamSchema } = require('../../validators/tournament.validator');

const router = express.Router();

router.get('/global', requireAuth, statsController.getGlobalStats);
router.get('/players/:id', requireAuth, validate(uuidParamSchema), statsController.getPlayerStats);
router.get('/tournaments/:id', requireAuth, validate(uuidParamSchema), statsController.getTournamentStats);

module.exports = router;
