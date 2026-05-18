const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const env = require('../config/env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: env.db.dialect,
  logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  define: { timestamps: true },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

const db = { sequelize, Sequelize };

fs.readdirSync(__dirname)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'))
  .forEach((file) => {
    const modelFactory = require(path.join(__dirname, file));
    const model = modelFactory(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach((model) => {
  if (model && typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;
