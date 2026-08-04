const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(payload) {
  // No expiresIn => no `exp` claim => jwt.verify never rejects it for expiration.
  // Only way to invalidate an issued one is rotating JWT_ACCESS_SECRET (logs out everyone).
  const options = env.jwt.accessExpiresIn ? { expiresIn: env.jwt.accessExpiresIn } : {};
  return jwt.sign(payload, env.jwt.accessSecret, options);
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
