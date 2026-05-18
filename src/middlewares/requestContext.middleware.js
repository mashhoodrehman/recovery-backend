const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const requestContext = (req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.http
      ? logger.http('request', meta(req, res, durationMs))
      : logger.info('request', meta(req, res, durationMs));
  });

  next();
};

function meta(req, res, durationMs) {
  return {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    durationMs: Number(durationMs.toFixed(2)),
    ip: req.ip,
    userId: req.user ? req.user.id : null,
    ua: req.headers['user-agent'],
  };
}

module.exports = { requestContext };
