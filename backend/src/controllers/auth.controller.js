const authService = require('../services/auth.service');
const { success } = require('../utils/apiResponse');

async function login(req, res, next) {
  try {
    const result = await authService.login(req.validated.body);
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const { email, password, displayName, role } = req.validated.body;
    const result = await authService.register({ email, password, displayName, role });
    return success(res, result, null, 201);
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      const error = new Error('refreshToken es requerido');
      error.statusCode = 422;
      throw error;
    }

    const result = await authService.refreshSession(refreshToken);
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await authService.getCurrentUser(req.auth);
    return success(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  register,
  refresh,
  me,
};
