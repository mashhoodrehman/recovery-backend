const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const { collectPermissions } = require('../middlewares/permission.middleware');

const include = [
  { model: db.User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: db.User, as: 'driver', attributes: ['id', 'firstName', 'lastName', 'email'] },
];

const canManageAny = (req) => {
  const perms = collectPermissions(req.user);
  return perms.has('*') || perms.has('vehicles.manage.any');
};

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status, availability, vehicleType, ownerId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (availability) where.availability = availability;
  if (vehicleType) where.vehicleType = vehicleType;

  // Non-privileged users only see their own fleet
  if (!canManageAny(req)) {
    where.ownerId = req.user.id;
  } else if (ownerId) {
    where.ownerId = ownerId;
  }

  if (search) {
    where[db.Sequelize.Op.or] = [
      { plateNumber: { [db.Sequelize.Op.like]: `%${search}%` } },
      { model: { [db.Sequelize.Op.like]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * limit;
  const { rows, count } = await db.Vehicle.findAndCountAll({
    where,
    include,
    limit: Number(limit),
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });
  return ok(res, rows, 'Vehicles', { total: count, page: Number(page), limit: Number(limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const vehicle = await db.Vehicle.findByPk(req.params.id, { include });
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (!canManageAny(req) && vehicle.ownerId !== req.user.id) {
    throw ApiError.forbidden('Not allowed to view this vehicle');
  }
  return ok(res, vehicle);
});

const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  // Owners create vehicles for themselves unless they can manage any fleet
  if (!canManageAny(req) || !payload.ownerId) {
    payload.ownerId = req.user.id;
  }
  const vehicle = await db.Vehicle.create(payload);
  const full = await db.Vehicle.findByPk(vehicle.id, { include });
  return created(res, full, 'Vehicle created');
});

const update = asyncHandler(async (req, res) => {
  const vehicle = await db.Vehicle.findByPk(req.params.id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (!canManageAny(req) && vehicle.ownerId !== req.user.id) {
    throw ApiError.forbidden('Not allowed to update this vehicle');
  }
  await vehicle.update(req.body);
  const full = await db.Vehicle.findByPk(vehicle.id, { include });
  return ok(res, full, 'Vehicle updated');
});

const remove = asyncHandler(async (req, res) => {
  const vehicle = await db.Vehicle.findByPk(req.params.id);
  if (!vehicle) throw ApiError.notFound('Vehicle not found');
  if (!canManageAny(req) && vehicle.ownerId !== req.user.id) {
    throw ApiError.forbidden('Not allowed to delete this vehicle');
  }
  await vehicle.destroy(); // soft delete (paranoid)
  return ok(res, null, 'Vehicle deleted');
});

module.exports = { list, getOne, create, update, remove };
