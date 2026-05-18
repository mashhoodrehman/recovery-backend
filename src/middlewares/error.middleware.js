const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 422;
    message = 'Validation failed';
    details = (err.errors || []).map((e) => ({ path: e.path, message: e.message }));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  const logPayload = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    userId: req.user ? req.user.id : null,
    requestId: req.id,
    err,
  };

  if (statusCode >= 500) {
    logger.error(message, logPayload);
  } else {
    logger.warn(message, logPayload);
  }

  const body = { success: false, message, details };
  if (env.nodeEnv !== 'production' && statusCode >= 500) {
    body.stack = err.stack;
  }
  res.status(statusCode).json(body);
};

module.exports = { notFoundHandler, errorHandler };
