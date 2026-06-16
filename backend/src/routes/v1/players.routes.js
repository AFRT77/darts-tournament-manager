const express = require('express');
const playerController = require('../../controllers/player.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const {
  uuidParamSchema,
  listPlayersSchema,
  createPlayerSchema,
  updatePlayerSchema,
} = require('../../validators/player.validator');

const router = express.Router();

router.get('/', requireAuth, validate(listPlayersSchema), playerController.listPlayers);
router.get('/:id', requireAuth, validate(uuidParamSchema), playerController.getPlayer);
router.post('/', requireAuth, requireRole('admin'), validate(createPlayerSchema), playerController.createPlayer);
router.put('/:id', requireAuth, requireRole('admin'), validate(updatePlayerSchema), playerController.updatePlayer);
router.delete('/:id/permanent', requireAuth, requireRole('admin'), validate(uuidParamSchema), playerController.deletePlayerPermanent);
router.delete('/:id', requireAuth, requireRole('admin'), validate(uuidParamSchema), playerController.deactivatePlayer);

module.exports = router;
