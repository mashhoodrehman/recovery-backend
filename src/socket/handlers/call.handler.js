const db = require('../../models');
const logger = require('../../utils/logger');

const CALLABLE_STATUSES = ['accepted', 'tower_en_route', 'at_pickup', 'in_progress'];

// Agora only carries the audio itself — these events are the ringing/accept/reject/end
// signaling so the app can show/dismiss an incoming-call screen, mirroring how chat.handler.js
// relays events through each participant's `user:<id>` room.
function registerCallHandlers(io, socket) {
  // payload: { rideId }
  socket.on('call:invite', async ({ rideId } = {}) => {
    if (!rideId) return;
    try {
      const ride = await db.Ride.findByPk(rideId);
      if (!ride) return;

      const isMember = ride.customerId === socket.userId || ride.towerId === socket.userId;
      if (!isMember || !CALLABLE_STATUSES.includes(ride.status)) {
        return socket.emit('call:error', { rideId, error: 'Call not available for this ride' });
      }

      const otherPartyId = ride.customerId === socket.userId ? ride.towerId : ride.customerId;
      if (!otherPartyId) return;

      io.to(`user:${otherPartyId}`).emit('call:incoming', {
        rideId: Number(rideId),
        fromUserId: socket.userId,
        channel: `ride_${rideId}`,
      });
    } catch (err) {
      logger.error('call:invite error', { err });
    }
  });

  // payload: { rideId, toUserId }
  socket.on('call:accept', ({ rideId, toUserId } = {}) => {
    if (!rideId || !toUserId) return;
    io.to(`user:${toUserId}`).emit('call:accepted', { rideId: Number(rideId), fromUserId: socket.userId });
  });

  socket.on('call:reject', ({ rideId, toUserId } = {}) => {
    if (!rideId || !toUserId) return;
    io.to(`user:${toUserId}`).emit('call:rejected', { rideId: Number(rideId), fromUserId: socket.userId });
  });

  socket.on('call:end', ({ rideId, toUserId } = {}) => {
    if (!rideId || !toUserId) return;
    io.to(`user:${toUserId}`).emit('call:ended', { rideId: Number(rideId), fromUserId: socket.userId });
  });
}

module.exports = { registerCallHandlers };
