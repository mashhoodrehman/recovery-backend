const Joi = require('joi');

const listTransactions = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().max(48),
    userId: Joi.number().integer().positive(),
  }),
};

const userIdParam = {
  params: Joi.object({ userId: Joi.number().integer().positive().required() }),
};

const adjust = {
  body: Joi.object({
    userId: Joi.number().integer().positive().required(),
    amount: Joi.number()
      .invalid(0)
      .required()
      .messages({ 'any.invalid': 'amount must be non-zero' }),
    note: Joi.string().max(255).allow('', null),
  }),
};

module.exports = { listTransactions, userIdParam, adjust };
