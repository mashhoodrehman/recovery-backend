const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/password');

const userInclude = [
  {
    model: db.Role,
    as: 'roles',
    through: { attributes: [] },
    include: [{ model: db.Permission, as: 'permissions', through: { attributes: [] } }],
  },
];

const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const where = search
    ? {
        [Op.or]: [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};
  const offset = (page - 1) * limit;
  const { rows, count } = await db.User.findAndCountAll({
    where,
    include: userInclude,
    limit,
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });
  return ok(res, rows, 'Users', { total: count, page, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const user = await db.User.findByPk(req.params.id, { include: userInclude });
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user);
});

const create_ = asyncHandler(async (req, res) => {
  const { roleIds = [], password, ...rest } = req.body;
  const existing = await db.User.findOne({ where: { email: rest.email } });
  if (existing) throw ApiError.conflict('Email already in use');

  const hashed = await hashPassword(password);
  const t = await db.sequelize.transaction();
  try {
    const user = await db.User.create({ ...rest, password: hashed }, { transaction: t });
    if (roleIds.length) {
      const rows = roleIds.map((roleId) => ({ userId: user.id, roleId }));
      await db.UserRole.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
    }
    await t.commit();
    const full = await db.User.findByPk(user.id, { include: userInclude });
    return created(res, full, 'User created');
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

const update_ = asyncHandler(async (req, res) => {
  const user = await db.User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const { roleIds, password, ...rest } = req.body;

  if (rest.email && rest.email !== user.email) {
    const conflict = await db.User.findOne({ where: { email: rest.email } });
    if (conflict) throw ApiError.conflict('Email already in use');
  }

  const updates = { ...rest };
  if (password) updates.password = await hashPassword(password);

  const t = await db.sequelize.transaction();
  try {
    await user.update(updates, { transaction: t });
    if (Array.isArray(roleIds)) {
      await db.UserRole.destroy({ where: { userId: user.id }, transaction: t });
      const rows = roleIds.map((roleId) => ({ userId: user.id, roleId }));
      if (rows.length) {
        await db.UserRole.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
      }
    }
    await t.commit();
    const full = await db.User.findByPk(user.id, { include: userInclude });
    return ok(res, full, 'User updated');
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

const remove = asyncHandler(async (req, res) => {
  const user = await db.User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.id === req.user.id) throw ApiError.badRequest('Cannot delete your own account');
  await user.destroy();
  return noContent(res);
});

module.exports = { list, getOne, create: create_, update: update_, remove };
