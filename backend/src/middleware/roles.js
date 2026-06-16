const { fail } = require('../utils/apiResponse');

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.auth?.profile?.role;

    if (!role) {
      return fail(res, 'Perfil de usuario no disponible', 403);
    }

    if (!roles.includes(role)) {
      return fail(res, 'No tienes permisos para realizar esta acción', 403);
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
