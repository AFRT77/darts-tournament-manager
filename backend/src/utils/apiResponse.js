function success(res, data = null, meta = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
    error: null,
  });
}

function fail(res, message, statusCode = 400, details = null) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    meta: null,
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = {
  success,
  fail,
};
