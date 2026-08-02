const db = require('../../models');
const logger = require('../../utils/logger');
const notificationService = require('../../services/notification.service');
const { isUserOnline } = require('../presence');

// Push a notification to the other ride participant if they don't have a live socket connection.
async function notifyIfOffline(io, ride, senderId, senderName, preview) {
  const recipientId = ride.customerId === senderId ? ride.towerId : ride.customerId;
  if (!recipientId || isUserOnline(io, recipientId)) return;
  try {
    await notificationService.notify({
      userId: recipientId,
      type: 'chat_message',
      title: senderName || 'New message',
      body: preview,
      data: { rideId: ride.id },
    });
  } catch (err) {
    logger.error('chat offline-notify error', { err });
  }
}

function registerChatHandlers(io, socket) {
  // chat:send — text message
  // payload: { rideId, message }
  socket.on('chat:send', async ({ rideId, message } = {}) => {
    if (!rideId || !message || !message.trim()) return;

    try {
      const ride = await db.Ride.findByPk(rideId);
      if (!ride) return socket.emit('chat:error', { rideId, error: 'Ride not found' });

      const isMember = ride.customerId === socket.userId || ride.towerId === socket.userId;
      if (!isMember) return socket.emit('chat:error', { rideId, error: 'Not a ride participant' });

      if (['searching', 'bidding', 'cancelled', 'no_towers_available'].includes(ride.status)) {
        return socket.emit('chat:error', { rideId, error: 'Chat not available yet' });
      }

      const msg = await db.RideMessage.create({
        rideId,
        senderId: socket.userId,
        messageType: 'text',
        message: message.trim(),
      });

      const sender = await db.User.findByPk(socket.userId, {
        attributes: ['id', 'username', 'avatar', 'userType'],
      });

      const payload = {
        id: msg.id,
        rideId: Number(rideId),
        senderId: socket.userId,
        senderName: sender?.username,
        senderType: sender?.userType,
        senderAvatar: sender?.avatar,
        messageType: 'text',
        message: msg.message,
        createdAt: msg.createdAt,
      };

      // Broadcast to everyone in the ride room (both tower and customer)
      io.to(`ride:${rideId}`).emit('chat:message', payload);
      notifyIfOffline(io, ride, socket.userId, sender?.username, msg.message);

      logger.debug(`chat:message ride=${rideId} from=${socket.userId}`);
    } catch (err) {
      logger.error('chat:send error', { err });
      socket.emit('chat:error', { rideId, error: 'Message failed' });
    }
  });

  // chat:send_image — after image is uploaded via REST, client sends the URL here
  // payload: { rideId, imageUrl }
  socket.on('chat:send_image', async ({ rideId, imageUrl } = {}) => {
    if (!rideId || !imageUrl) return;

    try {
      const ride = await db.Ride.findByPk(rideId);
      if (!ride) return;

      const isMember = ride.customerId === socket.userId || ride.towerId === socket.userId;
      if (!isMember) return;

      const msg = await db.RideMessage.create({
        rideId,
        senderId: socket.userId,
        messageType: 'image',
        imageUrl,
      });

      const sender = await db.User.findByPk(socket.userId, {
        attributes: ['id', 'username', 'avatar', 'userType'],
      });

      const payload = {
        id: msg.id,
        rideId: Number(rideId),
        senderId: socket.userId,
        senderName: sender?.username,
        senderType: sender?.userType,
        senderAvatar: sender?.avatar,
        messageType: 'image',
        imageUrl,
        createdAt: msg.createdAt,
      };

      io.to(`ride:${rideId}`).emit('chat:message', payload);
      notifyIfOffline(io, ride, socket.userId, sender?.username, 'Sent a photo');
    } catch (err) {
      logger.error('chat:send_image error', { err });
    }
  });

  // chat:typing — broadcast typing indicator (no DB persist)
  socket.on('chat:typing', ({ rideId, isTyping } = {}) => {
    if (!rideId) return;
    socket.to(`ride:${rideId}`).emit('chat:typing', {
      userId: socket.userId,
      rideId: Number(rideId),
      isTyping: !!isTyping,
    });
  });

  // chat:read — mark all as read
  socket.on('chat:read', async ({ rideId } = {}) => {
    if (!rideId) return;
    try {
      await db.RideMessage.update(
        { isRead: true },
        {
          where: {
            rideId,
            senderId: { [db.Sequelize.Op.ne]: socket.userId },
            isRead: false,
          },
        }
      );
      socket.to(`ride:${rideId}`).emit('chat:read_ack', { rideId, readBy: socket.userId });
    } catch (err) {
      logger.error('chat:read error', { err });
    }
  });
}

module.exports = { registerChatHandlers };
