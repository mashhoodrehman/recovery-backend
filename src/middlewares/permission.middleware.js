const ApiError = require('../utils/ApiError');

/**
 * Flatten a user's roles+permissions into a Set of permission names.
 * Super-admins resolve to the wildcard '*'.
 * Expects req.user loaded with roles -> permissions (see auth.middleware).
 */
function collectPermissions(user) {
  if (!user || !user.roles) return new Set();
  const perms = new Set();
  for (const role of user.roles) {
    if (role.name === 'super-admin') perms.add('*');
    if (role.permissions) {
      for (const p of role.permissions) perms.add(p.name);
    }
  }
  return perms;
}

function userHas(user, required) {
  const perms = collectPermissions(user);
  if (perms.has('*')) return true;
  return perms.has(required);
}

// OR semantics: pass if the user holds ANY of the listed permissions.
const hasPermission = (...required) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  const ok = required.some((perm) => userHas(req.user, perm));
  if (!ok) return next(ApiError.forbidden(`Missing permission: ${required.join(' or ')}`));
  return next();
};

// AND semantics: pass only if the user holds ALL listed permissions.
const hasAllPermissions = (...required) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  const perms = collectPermissions(req.user);
  if (perms.has('*')) return next();
  for (const perm of required) {
    if (!perms.has(perm)) return next(ApiError.forbidden(`Missing permission: ${perm}`));
  }
  return next();
};

const hasRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  const userRoles = (req.user.roles || []).map((r) => r.name);
  if (!roles.some((r) => userRoles.includes(r))) {
    return next(ApiError.forbidden(`Missing role: ${roles.join(' or ')}`));
  }
  return next();
};

module.exports = { hasPermission, hasAllPermissions, hasRole, collectPermissions };
