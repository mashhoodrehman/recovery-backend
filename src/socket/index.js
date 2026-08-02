const { Server } = require('socket.io');
const { socketAuth } = require('./socketAuth');
const { registerTowerHandlers } = require('./handlers/tower.handler');
const { registerChatHandlers } = require('./handlers/chat.handler');
const { registerCallHandlers } = require('./handlers/call.handler');
const dispatch = require('../services/dispatch.service');
const logger = require('../utils/logger');
const env = require('../config/env');

function createSocketServer(httpServer, frontendUrl) {
  // Mobile clients don't send an Origin header — allow all
  const io = new Server(httpServer, {
    cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Without this, `io.to(room).emit(...)` and `io.sockets.adapter.rooms` only see sockets on
  // THIS process — fine for one instance, wrong the moment you run pm2 in cluster mode or more
  // than one app server. With REDIS_URL set, every room join/emit/broadcast is synced across
  // all instances via Redis pub/sub, which is what makes chat, presence (socket/presence.js),
  // and ride/admin broadcasts correct once you scale horizontally.
  if (env.redis.url) {
    try {
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const { createAdapter } = require('@socket.io/redis-adapter');
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const Redis = require('ioredis');
      const pubClient = new Redis(env.redis.url);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter attached — safe for multi-instance/cluster mode');
    } catch (err) {
      logger.error(`Failed to attach Socket.IO Redis adapter, falling back to single-process mode: ${err.message}`);
    }
  }

  // Inject io into dispatch service
  dispatch.setIo(io);

  // Auth middleware for all socket connections
  io.use(socketAuth);

  io.on('connection', (socket) => {
    // Every authenticated user joins their personal room
    socket.join(`user:${socket.userId}`);
    logger.info(`Socket connected: userId=${socket.userId} type=${socket.userType}`);

    // Register handlers
    registerTowerHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);

    // Self-heal on every connect (first connect AND reconnects): a tower's socket dropping
    // mid-ride clears its dispatch-side "on ride X" association (see towerOffline), and a new
    // socket — whether from a reconnect or a fresh app launch — never automatically rejoins the
    // ride's room on its own. Without this, location/chat/ride-status updates silently stop
    // reaching one or both parties after any network blip, with no visible error anywhere.
    restoreActiveRide(socket).catch((err) => logger.error('restoreActiveRide failed', { err }));

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: userId=${socket.userId} reason=${reason}`);
    });
  });

  return io;
}

const ACTIVE_RIDE_STATUSES = ['accepted', 'tower_en_route', 'at_pickup', 'in_progress'];

async function restoreActiveRide(socket) {
  const db = require('../models');
  const { Op } = db.Sequelize;

  const ride = await db.Ride.findOne({
    where: {
      [Op.or]: [{ customerId: socket.userId }, { towerId: socket.userId }],
      status: ACTIVE_RIDE_STATUSES,
    },
    order: [['id', 'DESC']],
  });
  if (!ride) return;

  socket.join(`ride:${ride.id}`);

  if (socket.userType === 'tower' && ride.towerId === socket.userId) {
    dispatch.towerStartRide(socket.userId, ride.id);
  }

  socket.emit('ride:resync', {
    rideId: ride.id,
    status: ride.status,
    towerId: ride.towerId,
    fareAmount: ride.fareAmount ? Number(ride.fareAmount) : null,
    paymentStatus: ride.paymentStatus,
  });

  logger.info(`Socket ${socket.id} (user ${socket.userId}) rejoined ride:${ride.id} on connect`);
}

module.exports = { createSocketServer };
