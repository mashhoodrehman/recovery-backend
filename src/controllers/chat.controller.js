const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const path = require('path');
const notificationService = require('../services/notification.service');
const { isUserOnline } = require('../socket/presence');

function buildFileUrl(req, filePath) {
  const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return `${base}/${rel}`;
}

// Verify caller is part of the ride (customer or accepted tower)
async function assertRideAccess(rideId, userId) {
  const ride = await db.Ride.findByPk(rideId);
  if (!ride) throw ApiError.notFound('Ride not found');

  const isMember = ride.customerId === userId || ride.towerId === userId;
  if (!isMember) throw ApiError.forbidden('Not a participant of this ride');

  if (['searching', 'bidding', 'cancelled', 'no_towers_available'].includes(ride.status)) {
    throw ApiError.badRequest('Chat is only available after a tower has been accepted');
  }

  return ride;
}

// GET /mobile/rides/:rideId/messages
const getMessages = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  await assertRideAccess(rideId, req.user.id);

  const { count, rows } = await db.RideMessage.findAndCountAll({
    where: { rideId },
    include: [{ model: db.User, as: 'sender', attributes: ['id', 'username', 'avatar', 'userType'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  // Mark unread messages as read for this user
  await db.RideMessage.update(
    { isRead: true },
    { where: { rideId, senderId: { [db.Sequelize.Op.ne]: req.user.id }, isRead: false } }
  );

  return ok(res, {
    messages: rows.reverse(),
    meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
  });
});

// POST /mobile/rides/:rideId/messages/image  (multipart upload)
const sendImage = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  if (!req.file) throw ApiError.badRequest('No image uploaded');

  const ride = await assertRideAccess(rideId, req.user.id);

  const imageUrl = buildFileUrl(req, req.file.path);

  const msg = await db.RideMessage.create({
    rideId,
    senderId: req.user.id,
    messageType: 'image',
    imageUrl,
  });

  // Broadcast via socket so both parties see it immediately
  const io = req.app.get('io');
  if (io) {
    const payload = {
      id: msg.id,
      rideId: Number(rideId),
      senderId: req.user.id,
      senderName: req.user.username,
      senderType: req.user.userType,
      senderAvatar: req.user.avatar,
      messageType: 'image',
      imageUrl,
      createdAt: msg.createdAt,
    };
    io.to(`ride:${rideId}`).emit('chat:message', payload);
  }

  const recipientId = ride.customerId === req.user.id ? ride.towerId : ride.customerId;
  if (recipientId && !isUserOnline(io, recipientId)) {
    notificationService.notify({
      userId: recipientId,
      type: 'chat_message',
      title: req.user.username || 'New message',
      body: 'Sent a photo',
      data: { rideId: Number(rideId) },
    }).catch(() => {});
  }

  return ok(res, { imageUrl, messageId: msg.id }, 'Image sent');
});

module.exports = { getMessages, sendImage };
