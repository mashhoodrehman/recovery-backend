const bcrypt = require('bcryptjs');
const db = require('../models');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  signResetToken,
  verifyRefreshToken,
  verifyResetToken,
} = require('../utils/jwt');
const env = require('../config/env');
const logger = require('../utils/logger');
const mailer = require('./mailer.service');

function publicUser(user) {
  if (!user) return null;
  const json = user.toJSON ? user.toJSON() : user;
  delete json.password;
  delete json.refreshTokenHash;
  return json;
}

async function loadUserWithRoles(userId) {
  return db.User.findByPk(userId, {
    include: [
      {
        model: db.Role,
        as: 'roles',
        through: { attributes: [] },
        include: [{ model: db.Permission, as: 'permissions', through: { attributes: [] } }],
      },
    ],
  });
}

async function issueTokens(user) {
  const payload = { sub: user.id, email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await db.User.update({ refreshTokenHash, lastLoginAt: new Date() }, { where: { id: user.id } });
  return { accessToken, refreshToken };
}

async function signup({ firstName, lastName, email, phone, password, role = 'customer' }) {
  const existing = await db.User.findOne({ where: { email } });
  if (existing) throw ApiError.conflict('Email already in use');

  const hashed = await hashPassword(password);
  const t = await db.sequelize.transaction();
  try {
    const user = await db.User.create(
      { firstName, lastName, email, phone, password: hashed },
      { transaction: t }
    );
    const roleRecord = await db.Role.findOne({ where: { name: role }, transaction: t });
    if (roleRecord) {
      await db.UserRole.create({ userId: user.id, roleId: roleRecord.id }, { transaction: t });
    }
    await t.commit();
    const full = await loadUserWithRoles(user.id);
    const tokens = await issueTokens(full);
    return { user: publicUser(full), ...tokens };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function login({ email, password }) {
  const user = await db.User.scope('withSecret').findOne({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');
  const ok = await comparePassword(password, user.password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const full = await loadUserWithRoles(user.id);
  const tokens = await issueTokens(full);
  return { user: publicUser(full), ...tokens };
}

async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const user = await db.User.scope('withSecret').findByPk(payload.sub);
  if (!user || !user.isActive || !user.refreshTokenHash) {
    throw ApiError.unauthorized('Refresh token rejected');
  }
  const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!match) throw ApiError.unauthorized('Refresh token rejected');

  const full = await loadUserWithRoles(user.id);
  const tokens = await issueTokens(full);
  return { user: publicUser(full), ...tokens };
}

async function logout(userId) {
  await db.User.update({ refreshTokenHash: null }, { where: { id: userId } });
}

async function forgotPassword({ email }) {
  const user = await db.User.findOne({ where: { email } });
  if (!user) {
    logger.info('Password reset requested for unknown email', { email });
    return { sent: true };
  }
  const token = signResetToken({ sub: user.id, email: user.email });
  const resetUrl = `${env.frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  logger.info('Password reset link generated', { userId: user.id, resetUrl });
  try {
    await mailer.sendPasswordResetEmail(user, resetUrl);
  } catch (err) {
    logger.error('Failed to send password reset email', { err });
  }
  return { sent: true };
}

async function resetPassword({ token, password }) {
  let payload;
  try {
    payload = verifyResetToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired reset token');
  }
  const user = await db.User.findByPk(payload.sub);
  if (!user) throw ApiError.notFound('User not found');

  const hashed = await hashPassword(password);
  await db.User.update(
    { password: hashed, refreshTokenHash: null },
    { where: { id: user.id } }
  );
  return { reset: true };
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  loadUserWithRoles,
  publicUser,
};
