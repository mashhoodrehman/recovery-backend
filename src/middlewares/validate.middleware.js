const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, _res, next) => {
  const targets = ['body', 'query', 'params'];
  const errors = [];
  for (const target of targets) {
    if (!schema[target]) continue;
    const { error, value } = schema[target].validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      for (const d of error.details) {
        errors.push({ target, path: d.path.join('.'), message: d.message });
      }
    } else {
      req[target] = value;
    }
  }
  if (errors.length) {
    return next(ApiError.unprocessable('Validation failed', errors));
  }
  return next();
};

module.exports = { validate };
