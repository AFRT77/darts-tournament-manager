const tournamentService = require('../services/tournament.service');
const { success } = require('../utils/apiResponse');

async function listTournaments(req, res, next) {
  try {
    const { page, limit, status, search } = req.validated.query;
    const result = await tournamentService.list({ page, limit, status, search });
    return success(res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function getTournament(req, res, next) {
  try {
    const tournament = await tournamentService.getById(req.validated.params.id);
    return success(res, tournament);
  } catch (error) {
    return next(error);
  }
}

async function createTournament(req, res, next) {
  try {
    const tournament = await tournamentService.create(req.validated.body);
    return success(res, tournament, null, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateTournament(req, res, next) {
  try {
    const tournament = await tournamentService.update(req.validated.params.id, req.validated.body);
    return success(res, tournament);
  } catch (error) {
    return next(error);
  }
}

async function listTournamentPlayers(req, res, next) {
  try {
    const players = await tournamentService.listPlayers(req.validated.params.id);
    return success(res, players);
  } catch (error) {
    return next(error);
  }
}

async function addTournamentPlayers(req, res, next) {
  try {
    const players = await tournamentService.addPlayers(
      req.validated.params.id,
      req.validated.body.playerIds
    );
    return success(res, players, null, 201);
  } catch (error) {
    return next(error);
  }
}

async function removeTournamentPlayer(req, res, next) {
  try {
    const players = await tournamentService.removePlayer(
      req.validated.params.id,
      req.validated.params.playerId
    );
    return success(res, players);
  } catch (error) {
    return next(error);
  }
}

async function startTournament(req, res, next) {
  try {
    const tournament = await tournamentService.start(req.validated.params.id);
    return success(res, tournament);
  } catch (error) {
    return next(error);
  }
}

async function finishTournament(req, res, next) {
  try {
    const tournament = await tournamentService.finish(req.validated.params.id);
    return success(res, tournament);
  } catch (error) {
    return next(error);
  }
}

async function deleteTournament(req, res, next) {
  try {
    const result = await tournamentService.delete(req.validated.params.id);
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getKnockoutQualifiers(req, res, next) {
  try {
    const data = await tournamentService.getKnockoutQualifiers(req.validated.params.id);
    return success(res, data);
  } catch (error) {
    return next(error);
  }
}

async function setKnockoutQualifiers(req, res, next) {
  try {
    const result = await tournamentService.setKnockoutQualifiers(
      req.validated.params.id,
      req.validated.body.qualifiers
    );
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  listTournamentPlayers,
  addTournamentPlayers,
  removeTournamentPlayer,
  startTournament,
  finishTournament,
  deleteTournament,
  getKnockoutQualifiers,
  setKnockoutQualifiers,
};
