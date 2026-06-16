const standingsService = require('../services/standings.service');
const statsService = require('../services/stats.service');
const { success } = require('../utils/apiResponse');

async function getTournamentStandings(req, res, next) {
  try {
    const group = req.query.group || null;
    const result = await standingsService.getStandings(req.validated.params.id, { group });
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

async function getGlobalStats(req, res, next) {
  try {
    const stats = await statsService.getGlobalStats();
    return success(res, stats);
  } catch (error) {
    return next(error);
  }
}

async function getPlayerStats(req, res, next) {
  try {
    const stats = await statsService.getPlayerStats(req.validated.params.id);
    return success(res, stats);
  } catch (error) {
    return next(error);
  }
}

async function getTournamentStats(req, res, next) {
  try {
    const stats = await statsService.getTournamentStats(req.validated.params.id);
    return success(res, stats);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTournamentStandings,
  getGlobalStats,
  getPlayerStats,
  getTournamentStats,
};
