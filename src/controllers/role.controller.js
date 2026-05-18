const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

const include = [
  { model: db.Permission, as: 'permissions', through: { attributes: [] } },
];

const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const where = search
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};
  const offset = (page - 1) * limit;
  const { rows, count } = await db.Role.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [['id', 'ASC']],
    distinct: true,
  });
  return ok(res, rows, 'Roles', { total: count, page, limit });
});

const getOne = asyncHandler(async (req, res) => {
  const role = await db.Role.findByPk(req.params.id, { include });
  if (!role) throw ApiError.notFound('Role not found');
  return ok(res, role);
});

const create_ = asyncHandler(async (req, res) => {
  const { name, description, permissionIds = [] } = req.body;
  const existing = await db.Role.findOne({ where: { name } });
  if (existing) throw ApiError.conflict('Role name already exists');

  const t = await db.sequelize.transaction();
  try {
    const role = await db.Role.create({ name, description }, { transaction: t });
    if (permissionIds.length) {
      const rows = permissionIds.map((permissionId) => ({ roleId: role.id, permissionId }));
      await db.RolePermission.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
    }
    await t.commit();
    const full = await db.Role.findByPk(role.id, { include });
    return created(res, full, 'Role created');
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

const update_ = asyncHandler(async (req, res) => {
  const role = await db.Role.findByPk(req.params.id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.name === 'super-admin' && req.body.name && req.body.name !== 'super-admin') {
    throw ApiError.forbidden('The super-admin role cannot be renamed');
  }

  const { name, description, permissionIds } = req.body;
  const t = await db.sequelize.transaction();
  try {
    if (name && name !== role.name) {
      const conflict = await db.Role.findOne({ where: { name } });
      if (conflict) throw ApiError.conflict('Role name already exists');
    }
    await role.update(
      { ...(name && { name }), ...(description !== undefined && { description }) },
      { transaction: t }
    );
    if (Array.isArray(permissionIds)) {
      await db.RolePermission.destroy({ where: { roleId: role.id }, transaction: t });
      const rows = permissionIds.map((permissionId) => ({ roleId: role.id, permissionId }));
      if (rows.length) {
        await db.RolePermission.bulkCreate(rows, { transaction: t, ignoreDuplicates: true });
      }
    }
    await t.commit();
    const full = await db.Role.findByPk(role.id, { include });
    return ok(res, full, 'Role updated');
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

const remove = asyncHandler(async (req, res) => {
  const role = await db.Role.findByPk(req.params.id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.name === 'super-admin') throw ApiError.forbidden('The super-admin role is protected');
  await role.destroy();
  return noContent(res);
});

module.exports = { list, getOne, create: create_, update: update_, remove };
