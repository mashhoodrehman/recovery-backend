const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const env = require('../config/env');

const SENSITIVE_KEYS = new Set([
  'password',
  'password_confirmation',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'resettoken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'apikey',
  'api_key',
  'client_secret',
  'creditcard',
  'card_number',
  'cvv',
  'pin',
  'otp',
  'ssn',
]);

const REDACTED = '[REDACTED]';

function sanitize(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v, seen));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...sanitize({ ...value }, seen),
    };
  }

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
      out[key] = REDACTED;
    } else {
      out[key] = sanitize(val, seen);
    }
  }
  return out;
}

const sanitizeFormat = winston.format((info) => {
  const cleaned = sanitize(info);
  return { ...cleaned, level: info.level, message: info.message };
})();

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  sanitizeFormat,
  winston.format.printf(({ timestamp, level, message, ...rest }) => {
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    return `${timestamp} ${level}: ${message}${meta}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  sanitizeFormat,
  winston.format.json()
);

const transports = [
  new winston.transports.Console({ format: consoleFormat }),
  new DailyRotateFile({
    filename: path.join(env.log.dir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: env.log.level,
    format: fileFormat,
  }),
  new DailyRotateFile({
    filename: path.join(env.log.dir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: fileFormat,
  }),
];

const logger = winston.createLogger({
  level: env.log.level,
  defaultMeta: { service: env.appName },
  transports,
  exitOnError: false,
});

logger.sanitize = sanitize;

module.exports = logger;
