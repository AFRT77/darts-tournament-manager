const express = require('express');
const tournamentController = require('../../controllers/tournament.controller');
const matchController = require('../../controllers/match.controller');
const statsController = require('../../controllers/stats.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const {
  uuidParamSchema,
  tournamentPlayerParamSchema,
  listTournamentsSchema,
  createTournamentSchema,
  updateTournamentSchema,
  addPlayersSchema,
  knockoutQualifiersSchema,
} = require('../../validators/tournament.validator');

const router = express.Router();

router.get('/', validate(listTournamentsSchema), tournamentController.listTournaments);
router.post('/', requireAuth, requireRole('admin'), validate(createTournamentSchema), tournamentController.createTournament);
router.get('/:id', validate(uuidParamSchema), tournamentController.getTournament);
router.put('/:id', requireAuth, requireRole('admin'), validate(updateTournamentSchema), tournamentController.updateTournament);
router.get('/:id/players', requireAuth, validate(uuidParamSchema), tournamentController.listTournamentPlayers);
router.post('/:id/players', requireAuth, requireRole('admin'), validate(addPlayersSchema), tournamentController.addTournamentPlayers);
router.delete('/:id/players/:playerId', requireAuth, requireRole('admin'), validate(tournamentPlayerParamSchema), tournamentController.removeTournamentPlayer);
router.get('/:id/knockout-qualifiers', requireAuth, validate(uuidParamSchema), tournamentController.getKnockoutQualifiers);
router.put('/:id/knockout-qualifiers', requireAuth, requireRole('admin'), validate(knockoutQualifiersSchema), tournamentController.setKnockoutQualifiers);
router.post('/:id/start', requireAuth, requireRole('admin'), validate(uuidParamSchema), tournamentController.startTournament);
router.post('/:id/finish', requireAuth, requireRole('admin'), validate(uuidParamSchema), tournamentController.finishTournament);
router.delete('/:id', requireAuth, requireRole('admin'), validate(uuidParamSchema), tournamentController.deleteTournament);
router.get('/:id/matches', validate(uuidParamSchema), matchController.listTournamentMatches);
router.post('/:id/generate-matches', requireAuth, requireRole('admin'), validate(uuidParamSchema), matchController.generateMatches);
router.post('/:id/generate-knockout', requireAuth, requireRole('admin'), validate(uuidParamSchema), matchController.generateKnockout);
router.get('/:id/bracket', validate(uuidParamSchema), matchController.getBracket);
router.get('/:id/standings', validate(uuidParamSchema), statsController.getTournamentStandings);

module.exports = router;
