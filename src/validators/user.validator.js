const Joi = require('joi');

const email = Joi.string().email({ tlds: { allow: false } });

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().allow('').default(''),
  }),
};

const create = {
  body: Joi.object({
    firstName: Joi.string().min(1).max(80).required(),
    lastName: Joi.string().max(80).allow('', null),
    email: email.required(),
    phone: Joi.string().max(32).allow('', null),
    password: Joi.string().min(8).max(128).required(),
    isActive: Joi.boolean().default(true),
    roleIds: Joi.array().items(Joi.number().integer().positive()).default([]),
  }),
};

const update = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
  body: Joi.object({
    firstName: Joi.string().min(1).max(80),
    lastName: Joi.string().max(80).allow('', null),
    email,
    phone: Joi.string().max(32).allow('', null),
    password: Joi.string().min(8).max(128),
    isActive: Joi.boolean(),
    roleIds: Joi.array().items(Joi.number().integer().positive()),
  }).min(1),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

module.exports = { list, create, update, idParam };
