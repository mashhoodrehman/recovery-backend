const Joi = require('joi');

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    unread: Joi.boolean(),
    userId: Joi.number().integer().positive(),
  }),
};

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const send = {
  body: Joi.object({
    title: Joi.string().max(160).required(),
    body: Joi.string().max(500).allow('', null),
    type: Joi.string().max(64),
    userIds: Joi.array().items(Joi.number().integer().positive()),
    broadcast: Joi.boolean(),
    data: Joi.object().unknown(true).allow(null),
  }).or('userIds', 'broadcast'),
};

const registerToken = {
  body: Joi.object({
    fcmToken: Joi.string().max(512).required(),
  }),
};

module.exports = { list, idParam, send, registerToken };
