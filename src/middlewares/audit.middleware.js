const db = require('../models');
const logger = require('../utils/logger');

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Don't log auth bodies / noise
const SKIP_PATHS = [/\/auth\/login/, /\/auth\/refresh/, /\/auth\/signup/];

/**
 * Activity logging: records mutating requests after the response is sent.
 * Non-blocking and fail-safe — auditing must never break the request.
 */
const auditLogger = (req, res, next) => {
  if (!MUTATING.has(req.method)) return next();
  if (SKIP_PATHS.some((re) => re.test(req.originalUrl))) return next();

  res.on('finish', () => {
    // Only persist successful mutations
    if (res.statusCode >= 400) return;
    const segments = req.originalUrl.split('?')[0].split('/').filter(Boolean);
    const entity = segments[2] || segments[1] || null; // /api/v1/<entity>/...
    const entityId = segments[3] && /^\d+$/.test(segments[3]) ? segments[3] : null;

    db.AuditLog.create({
      userId: req.user?.id || null,
      action: req.method,
      method: req.method,
      entity,
      entityId,
      statusCode: res.statusCode,
      path: req.originalUrl.split('?')[0],
      ip: req.ip,
      userAgent: (req.headers['user-agent'] || '').slice(0, 255),
    }).catch((err) => logger.error(`audit log failed: ${err.message}`));
  });

  return next();
};

module.exports = { auditLogger };
