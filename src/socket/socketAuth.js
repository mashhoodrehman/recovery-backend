const { verifyAccessToken } = require('../utils/jwt');
const db = require('../models');

async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Missing auth token'));

    const payload = verifyAccessToken(token);
    const user = await db.User.findByPk(payload.sub, {
      attributes: ['id', 'firstName', 'lastName', 'userType', 'isActive'],
    });
    if (!user || !user.isActive) return next(new Error('User unavailable'));

    socket.userId = user.id;
    socket.userType = user.userType;
    socket.user = user;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
}

module.exports = { socketAuth };
