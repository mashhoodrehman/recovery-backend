const Joi = require('joi');

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(100),
    search: Joi.string().allow('').default(''),
    group: Joi.string().allow('').default(''),
  }),
};

const create = {
  body: Joi.object({
    name: Joi.string().min(2).max(96).required(),
    group: Joi.string().max(64).allow('', null),
    description: Joi.string().max(255).allow('', null),
  }),
};

const update = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    name: Joi.string().min(2).max(96),
    group: Joi.string().max(64).allow('', null),
    description: Joi.string().max(255).allow('', null),
  }).min(1),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

module.exports = { list, create, update, idParam };
