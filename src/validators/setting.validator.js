const Joi = require('joi');

const update = {
  body: Joi.object({
    settings: Joi.array()
      .items(
        Joi.object({
          key: Joi.string().max(96).required(),
          value: Joi.any().required(),
        })
      )
      .min(1)
      .required(),
  }),
};

module.exports = { update };
