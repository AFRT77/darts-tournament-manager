const { fail } = require('../utils/apiResponse');

function notFound(req, res) {
  return fail(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  return fail(res, message, statusCode, err.details || undefined);
}

module.exports = {
  notFound,
  errorHandler,
};
