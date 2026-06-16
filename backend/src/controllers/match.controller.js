const matchService = require('../services/match.service');
const { success } = require('../utils/apiResponse');

async function listTournamentMatches(req, res, next) {
  try {
    const matches = await matchService.listByTournament(req.validated.params.id);
    return success(res, matches);
  } catch (error) {
    return next(error);
  }
}

async function generateMatches(req, res, next) {
  try {
    const matches = await matchService.generateForTournament(req.validated.params.id);
    return success(res, matches, null, 201);
  } catch (error) {
    return next(error);
  }
}

async function generateKnockout(req, res, next) {
  try {
    const matches = await matchService.generateKnockoutPhase(req.validated.params.id);
    return success(res, matches, null, 201);
  } catch (error) {
    return next(error);
  }
}

async function getBracket(req, res, next) {
  try {
    const bracket = await matchService.getBracket(req.validated.params.id);
    return success(res, bracket);
  } catch (error) {
    return next(error);
  }
}

async function getMatch(req, res, next) {
  try {
    const match = await matchService.getById(req.validated.params.matchId);
    return success(res, match);
  } catch (error) {
    return next(error);
  }
}

async function recordLeg(req, res, next) {
  try {
    const result = await matchService.recordLeg(req.validated.params.matchId, req.validated.body);
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

async function setWalkover(req, res, next) {
  try {
    const match = await matchService.setWalkover(req.validated.params.matchId, req.validated.body);
    return success(res, match);
  } catch (error) {
    return next(error);
  }
}

async function updateResult(req, res, next) {
  try {
    const match = await matchService.updateResult(req.validated.params.matchId, req.validated.body);
    return success(res, match);
  } catch (error) {
    return next(error);
  }
}

async function resetMatch(req, res, next) {
  try {
    const match = await matchService.resetMatch(req.validated.params.matchId);
    return success(res, match);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTournamentMatches,
  generateMatches,
  generateKnockout,
  getBracket,
  getMatch,
  recordLeg,
  setWalkover,
  updateResult,
  resetMatch,
};
