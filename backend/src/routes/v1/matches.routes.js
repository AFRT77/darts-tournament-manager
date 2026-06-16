const express = require('express');
const matchController = require('../../controllers/match.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { matchParamSchema, recordLegSchema, walkoverSchema } = require('../../validators/match.validator');

const router = express.Router();

router.get('/:matchId', requireAuth, validate(matchParamSchema), matchController.getMatch);
router.post('/:matchId/legs', requireAuth, requireRole('admin'), validate(recordLegSchema), matchController.recordLeg);
router.put('/:matchId/result', requireAuth, requireRole('admin'), validate(walkoverSchema), matchController.setWalkover);

module.exports = router;
