const dispatch = require('../../services/dispatch.service');
const db = require('../../models');
const logger = require('../../utils/logger');

function registerTowerHandlers(io, socket) {
  // Tower goes online — sends initial lat/lng
  socket.on('tower:online', async ({ lat, lng, ts } = {}) => {
    if (!lat || !lng) return;
    try {
      await db.User.update(
        { isOnline: true, currentLat: lat, currentLng: lng, lastSeenAt: new Date() },
        { where: { id: socket.userId } }
      );
      dispatch.towerOnline(socket.userId, socket.id, lat, lng, ts);
      socket.emit('tower:online_ack', { success: true });
      logger.info(`Tower ${socket.userId} online at ${lat},${lng}`);
    } catch (err) {
      logger.error('tower:online error', { err });
    }
  });

  // Tower sends location update (every 3-5 s from mobile).
  // `ts` (client device timestamp, ms) lets the server drop out-of-order updates — see
  // dispatch.service.js#updateTowerLocation.
  socket.on('tower:location_update', ({ lat, lng, ts } = {}) => {
    if (!lat || !lng) return;
    dispatch.updateTowerLocation(socket.userId, lat, lng, socket.id, ts);
  });

  // Tower goes offline
  socket.on('tower:offline', async () => {
    try {
      await db.User.update(
        { isOnline: false, lastSeenAt: new Date() },
        { where: { id: socket.userId } }
      );
      dispatch.towerOffline(socket.userId);
      socket.emit('tower:offline_ack', { success: true });
      logger.info(`Tower ${socket.userId} offline`);
    } catch (err) {
      logger.error('tower:offline error', { err });
    }
  });

  // Admin joins admin room
  socket.on('admin:join', async () => {
    socket.join('admin');
    // Send current state immediately
    const towers = await dispatch.getOnlineTowers();
    socket.emit('admin:online_towers', { towers, count: towers.length });
  });

  // Handle disconnect — mark tower offline
  socket.on('disconnect', async () => {
    const tower = dispatch.towerLocations.get(String(socket.userId));
    if (tower && tower.socketId === socket.id) {
      dispatch.towerOffline(socket.userId);
      try {
        await db.User.update(
          { isOnline: false, lastSeenAt: new Date() },
          { where: { id: socket.userId } }
        );
      } catch (err) {
        logger.error('disconnect update error', { err });
      }
    }
  });
}

module.exports = { registerTowerHandlers };
