const Joi = require('joi');

const createRequest = {
  body: Joi.object({
    vehicleType: Joi.string().max(64).allow('', null),
    vehiclePlate: Joi.string().max(32).allow('', null),
    issueDescription: Joi.string().max(2000).allow('', null),
    pickupAddress: Joi.string().max(255).required(),
    pickupLat: Joi.number().min(-90).max(90).required(),
    pickupLng: Joi.number().min(-180).max(180).required(),
    dropoffAddress: Joi.string().max(255).allow('', null),
    dropoffLat: Joi.number().min(-90).max(90).allow(null),
    dropoffLng: Joi.number().min(-180).max(180).allow(null),
  }),
};

const listRequests = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('open', 'assigned', 'in_progress', 'completed', 'cancelled'),
    scope: Joi.string().valid('mine', 'all').default('all'),
  }),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const placeBid = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    etaMinutes: Joi.number().integer().positive().allow(null),
    note: Joi.string().max(500).allow('', null),
  }),
};

const acceptBid = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
    bidId: Joi.number().integer().positive().required(),
  }),
};

module.exports = { createRequest, listRequests, idParam, placeBid, acceptBid };
