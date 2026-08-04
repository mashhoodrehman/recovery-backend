const Joi = require('joi');

const email = Joi.string().email({ tlds: { allow: false } });
const password = Joi.string().min(8).max(128).required();

const signup = {
  body: Joi.object({
    firstName: Joi.string().min(1).max(80).required(),
    lastName: Joi.string().max(80).allow('', null),
    email: email.required(),
    phone: Joi.string().max(32).allow('', null),
    password,
    role: Joi.string().valid('customer', 'recovery-provider').default('customer'),
  }),
};

const login = {
  body: Joi.object({
    email: email.required(),
    password: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object({
    email: email.required(),
  }),
};

const resetPassword = {
  body: Joi.object({
    token: Joi.string().required(),
    password,
  }),
};

module.exports = { signup, login, forgotPassword, resetPassword };
