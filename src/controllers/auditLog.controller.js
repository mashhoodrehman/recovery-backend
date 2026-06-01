const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');

// GET /audit-logs
const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, userId, entity, action } = req.query;
  const where = {};
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const offset = (page - 1) * limit;
  const { rows, count } = await db.AuditLog.findAndCountAll({
    where,
    include: [{ model: db.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    limit: Number(limit),
    offset,
    order: [['id', 'DESC']],
  });
  return ok(res, rows, 'Audit logs', { total: count, page: Number(page), limit: Number(limit) });
});

module.exports = { list };
