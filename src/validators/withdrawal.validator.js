const Joi = require('joi');

const METHODS = ['bank_transfer', 'paypal', 'stripe'];
const STATUSES = ['pending', 'approved', 'rejected', 'paid'];

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid(...STATUSES),
    userId: Joi.number().integer().positive(),
    scope: Joi.string().valid('mine', 'all'),
  }),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const create = {
  body: Joi.object({
    amount: Joi.number().positive().required(),
    method: Joi.string().valid(...METHODS),
    payoutDetails: Joi.object().unknown(true).allow(null),
  }),
};

const reject = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    adminNote: Joi.string().max(255).allow('', null),
  }),
};

module.exports = { list, idParam, create, reject };
