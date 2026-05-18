const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

const list = asyncHandler(async (req, res) => {
  const { page, limit, search, group } = req.query;
  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }
  if (group) where.group = group;

  const offset = (page - 1) * limit;
  const { rows, count } = await db.Permission.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ['group', 'ASC'],
      ['name', 'ASC'],
    ],
  });
  return ok(res, rows, 'Permissions', { total: count, page, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const permission = await db.Permission.findByPk(req.params.id);
  if (!permission) throw ApiError.notFound('Permission not found');
  return ok(res, permission);
});

const create_ = asyncHandler(async (req, res) => {
  const existing = await db.Permission.findOne({ where: { name: req.body.name } });
  if (existing) throw ApiError.conflict('Permission name already exists');
  const permission = await db.Permission.create(req.body);
  return created(res, permission, 'Permission created');
});

const update_ = asyncHandler(async (req, res) => {
  const permission = await db.Permission.findByPk(req.params.id);
  if (!permission) throw ApiError.notFound('Permission not found');
  if (req.body.name && req.body.name !== permission.name) {
    const conflict = await db.Permission.findOne({ where: { name: req.body.name } });
    if (conflict) throw ApiError.conflict('Permission name already exists');
  }
  await permission.update(req.body);
  return ok(res, permission, 'Permission updated');
});

const remove = asyncHandler(async (req, res) => {
  const permission = await db.Permission.findByPk(req.params.id);
  if (!permission) throw ApiError.notFound('Permission not found');
  await permission.destroy();
  return noContent(res);
});

const groups = asyncHandler(async (_req, res) => {
  const rows = await db.Permission.findAll({
    order: [
      ['group', 'ASC'],
      ['name', 'ASC'],
    ],
  });
  const grouped = rows.reduce((acc, p) => {
    const key = p.group || 'general';
    acc[key] = acc[key] || [];
    acc[key].push(p);
    return acc;
  }, {});
  return ok(res, grouped, 'Permissions grouped');
});

module.exports = { list, getOne, create: create_, update: update_, remove, groups };
