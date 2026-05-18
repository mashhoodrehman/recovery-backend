const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../models');

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or invalid Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  const user = await db.User.findByPk(payload.sub, {
    include: [
      {
        model: db.Role,
        as: 'roles',
        through: { attributes: [] },
        include: [
          {
            model: db.Permission,
            as: 'permissions',
            through: { attributes: [] },
          },
        ],
      },
    ],
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User account is unavailable');
  }

  req.user = user;
  req.userId = user.id;
  return next();
});

module.exports = { authenticate };
