const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const authService = require('../services/auth.service');
const { collectPermissions } = require('../middlewares/permission.middleware');

const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  return created(res, result, 'Account created');
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ok(res, result, 'Logged in');
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body);
  return ok(res, result, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  return ok(res, null, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  const user = authService.publicUser(req.user);
  const permissions = Array.from(collectPermissions(req.user));
  return ok(res, { user, permissions }, 'Current user');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return ok(res, result, 'If the email exists, a reset link has been sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return ok(res, result, 'Password reset');
});

module.exports = { signup, login, refresh, logout, me, forgotPassword, resetPassword };
