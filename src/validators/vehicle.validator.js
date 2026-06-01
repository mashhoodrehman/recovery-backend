const Joi = require('joi');

const VEHICLE_TYPES = [
  'tow_truck',
  'flatbed_truck',
  'recovery_truck',
  'pickup_truck',
  'roadside_assistance',
];
const STATUSES = ['active', 'inactive', 'maintenance'];
const AVAILABILITY = ['available', 'busy', 'offline'];

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(120).allow('', null),
    status: Joi.string().valid(...STATUSES),
    availability: Joi.string().valid(...AVAILABILITY),
    vehicleType: Joi.string().valid(...VEHICLE_TYPES),
    ownerId: Joi.number().integer().positive(),
  }),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const create = {
  body: Joi.object({
    vehicleType: Joi.string()
      .valid(...VEHICLE_TYPES)
      .required(),
    plateNumber: Joi.string().max(32).required(),
    ownerId: Joi.number().integer().positive(),
    driverId: Joi.number().integer().positive().allow(null),
    model: Joi.string().max(64).allow('', null),
    year: Joi.number().integer().min(1900).max(2100).allow(null),
    capacity: Joi.number().min(0).allow(null),
    towingCapacity: Joi.number().min(0).allow(null),
    status: Joi.string().valid(...STATUSES),
    availability: Joi.string().valid(...AVAILABILITY),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
  }),
};

const update = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    vehicleType: Joi.string().valid(...VEHICLE_TYPES),
    plateNumber: Joi.string().max(32),
    driverId: Joi.number().integer().positive().allow(null),
    model: Joi.string().max(64).allow('', null),
    year: Joi.number().integer().min(1900).max(2100).allow(null),
    capacity: Joi.number().min(0).allow(null),
    towingCapacity: Joi.number().min(0).allow(null),
    status: Joi.string().valid(...STATUSES),
    availability: Joi.string().valid(...AVAILABILITY),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
  }).min(1),
};

module.exports = { list, idParam, create, update, VEHICLE_TYPES };
