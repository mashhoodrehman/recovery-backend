const Joi = require('joi');

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    search: Joi.string().allow('').default(''),
  }),
};

const create = {
  body: Joi.object({
    name: Joi.string().min(2).max(64).required(),
    description: Joi.string().max(255).allow('', null),
    permissionIds: Joi.array().items(Joi.number().integer().positive()).default([]),
  }),
};

const update = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    name: Joi.string().min(2).max(64),
    description: Joi.string().max(255).allow('', null),
    permissionIds: Joi.array().items(Joi.number().integer().positive()),
  }).min(1),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

module.exports = { list, create, update, idParam };
