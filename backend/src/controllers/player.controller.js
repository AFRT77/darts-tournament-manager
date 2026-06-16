const playerService = require('../services/player.service');
const { success } = require('../utils/apiResponse');

async function listPlayers(req, res, next) {
  try {
    const { page, limit, search, active } = req.validated.query;
    const result = await playerService.list({ page, limit, search, active });
    return success(res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function getPlayer(req, res, next) {
  try {
    const player = await playerService.getById(req.validated.params.id);
    return success(res, player);
  } catch (error) {
    return next(error);
  }
}

async function createPlayer(req, res, next) {
  try {
    const { name, nickname, rankingPoints, profileId } = req.validated.body;
    const player = await playerService.create({ name, nickname, rankingPoints, profileId });
    return success(res, player, null, 201);
  } catch (error) {
    return next(error);
  }
}

async function updatePlayer(req, res, next) {
  try {
    const player = await playerService.update(req.validated.params.id, req.validated.body);
    return success(res, player);
  } catch (error) {
    return next(error);
  }
}

async function deactivatePlayer(req, res, next) {
  try {
    const player = await playerService.deactivate(req.validated.params.id);
    return success(res, player);
  } catch (error) {
    return next(error);
  }
}

async function deletePlayerPermanent(req, res, next) {
  try {
    const result = await playerService.hardDelete(req.validated.params.id);
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deactivatePlayer,
  deletePlayerPermanent,
};
