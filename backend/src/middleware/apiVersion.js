function apiVersion(req, res, next) {
  res.setHeader('X-API-Version', 'v1');
  next();
}

module.exports = {
  apiVersion,
};
