const Joi = require('joi');

const STATUSES = ['active', 'inactive', 'suspended'];

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(120).allow('', null),
    status: Joi.string().valid(...STATUSES),
  }),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const create = {
  body: Joi.object({
    name: Joi.string().max(128).required(),
    email: Joi.string().email().max(128).allow('', null),
    phone: Joi.string().max(32).allow('', null),
    registrationNumber: Joi.string().max(64).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    address: Joi.string().max(255).allow('', null),
    city: Joi.string().max(64).allow('', null),
    country: Joi.string().max(64).allow('', null),
    status: Joi.string().valid(...STATUSES),
  }),
};

const update = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    name: Joi.string().max(128),
    email: Joi.string().email().max(128).allow('', null),
    phone: Joi.string().max(32).allow('', null),
    registrationNumber: Joi.string().max(64).allow('', null),
    website: Joi.string().uri().max(255).allow('', null),
    address: Joi.string().max(255).allow('', null),
    city: Joi.string().max(64).allow('', null),
    country: Joi.string().max(64).allow('', null),
    status: Joi.string().valid(...STATUSES),
  }).min(1),
};

module.exports = { list, idParam, create, update };
