const { fail } = require('../utils/apiResponse');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return fail(res, 'Datos de entrada inválidos', 422, result.error.flatten());
    }

    req.validated = result.data;
    return next();
  };
}

module.exports = {
  validate,
};
