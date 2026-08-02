const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search) {
    where[db.Sequelize.Op.or] = [
      { name: { [db.Sequelize.Op.like]: `%${search}%` } },
      { email: { [db.Sequelize.Op.like]: `%${search}%` } },
      { city: { [db.Sequelize.Op.like]: `%${search}%` } },
      { registrationNumber: { [db.Sequelize.Op.like]: `%${search}%` } },
    ];
  }
  const offset = (page - 1) * limit;
  const { rows, count } = await db.Company.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['id', 'DESC']],
  });
  return ok(res, rows, 'Companies', { total: count, page: Number(page), limit: Number(limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const company = await db.Company.findByPk(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');
  return ok(res, company);
});

const create = asyncHandler(async (req, res) => {
  const company = await db.Company.create(req.body);
  return created(res, company, 'Company created');
});

const update = asyncHandler(async (req, res) => {
  const company = await db.Company.findByPk(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');
  await company.update(req.body);
  return ok(res, company, 'Company updated');
});

const remove = asyncHandler(async (req, res) => {
  const company = await db.Company.findByPk(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');
  await company.destroy();
  return ok(res, null, 'Company deleted');
});

module.exports = { list, getOne, create, update, remove };
