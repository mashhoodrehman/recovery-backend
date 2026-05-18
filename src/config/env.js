require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  appName: process.env.APP_NAME || 'RecoveryBackend',
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'recovery_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'mysql',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    resetSecret: process.env.JWT_RESET_SECRET || 'dev-reset-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    resetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '30m',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  },

  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@recovery.local',
    fromName: process.env.MAIL_FROM_NAME || 'Recovery System',
    secure: process.env.MAIL_SECURE === 'true',
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },
};

module.exports = env;
