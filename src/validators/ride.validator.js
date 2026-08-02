const Joi = require('joi');

const createRide = {
  body: Joi.object({
    fromAddress: Joi.string().max(255).allow('', null),
    fromLat: Joi.number().min(-90).max(90).required(),
    fromLng: Joi.number().min(-180).max(180).required(),
    toAddress: Joi.string().max(255).allow('', null),
    toLat: Joi.number().min(-90).max(90).required(),
    toLng: Joi.number().min(-180).max(180).required(),
    customerNote: Joi.string().max(500).allow('', null),
  }),
};

const placeBid = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    amount: Joi.number().positive().required(),
    etaMinutes: Joi.number().integer().min(1).max(120).allow(null),
    note: Joi.string().max(255).allow('', null),
  }),
};

const bidAction = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
    bidId: Joi.number().integer().positive().required(),
  }),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const cancelRide = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({ reason: Joi.string().max(255).allow('', null) }),
};

const locationUpdate = {
  body: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    // Client device timestamp (ms) — lets the server drop out-of-order updates. Optional for
    // backward compatibility with app builds that don't send it yet.
    ts: Joi.number().integer().positive(),
  }),
};

const rating = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    stars: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).allow('', null),
  }),
};

module.exports = { createRide, placeBid, bidAction, idParam, cancelRide, locationUpdate, rating };
