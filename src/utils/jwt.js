const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

function signResetToken(payload) {
  return jwt.sign(payload, env.jwt.resetSecret, { expiresIn: env.jwt.resetExpiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

function verifyResetToken(token) {
  return jwt.verify(token, env.jwt.resetSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  signResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyResetToken,
};
