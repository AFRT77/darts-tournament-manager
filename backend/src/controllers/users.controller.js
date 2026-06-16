const usersService = require('../services/users.service');
const { success } = require('../utils/apiResponse');

async function listUsers(req, res, next) {
  try {
    const { page, limit, search } = req.validated.query;
    const result = await usersService.list({ page, limit, search });
    return success(res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await usersService.update(req.validated.params.id, req.validated.body);
    return success(res, user);
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await usersService.delete(req.validated.params.id, req.auth.profile.id);
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  updateUser,
  deleteUser,
};
