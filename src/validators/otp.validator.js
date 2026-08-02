const Joi = require('joi');

const sendOtp = {
  body: Joi.object({
    phone: Joi.string().min(7).max(20).required(),
  }),
};

const verifyOtp = {
  body: Joi.object({
    phone: Joi.string().min(7).max(20).required(),
    otp: Joi.string().length(4).required(),
  }),
};

const setupProfile = {
  body: Joi.object({
    username: Joi.string().min(2).max(64).required(),
    userType: Joi.string().valid('customer', 'tower').required(),
    city: Joi.string().max(64).allow('', null),
  }),
};

module.exports = { sendOtp, verifyOtp, setupProfile };
