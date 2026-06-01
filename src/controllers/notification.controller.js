const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const notificationService = require('../services/notification.service');
const { collectPermissions } = require('../middlewares/permission.middleware');

const canManageAny = (req) => {
  const perms = collectPermissions(req.user);
  return perms.has('*') || perms.has('notifications.manage');
};

// GET /notifications — current user's notifications (or any with permission)
const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread, userId } = req.query;
  const where = {};

  if (canManageAny(req) && userId) {
    where.userId = userId;
  } else {
    where.userId = req.user.id;
  }
  if (unread === true) where.readAt = null;

  const offset = (page - 1) * limit;
  const { rows, count } = await db.Notification.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['id', 'DESC']],
  });
  const unreadCount = await db.Notification.count({
    where: { userId: where.userId || req.user.id, readAt: null },
  });
  return ok(res, rows, 'Notifications', {
    total: count,
    page: Number(page),
    limit: Number(limit),
    unreadCount,
  });
});

// POST /notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await db.Notification.findByPk(req.params.id);
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.userId !== req.user.id && !canManageAny(req)) {
    throw ApiError.forbidden('Not allowed');
  }
  if (!notification.readAt) await notification.update({ readAt: new Date() });
  return ok(res, notification, 'Marked as read');
});

// POST /notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await db.Notification.update(
    { readAt: new Date() },
    { where: { userId: req.user.id, readAt: null } }
  );
  return ok(res, null, 'All notifications marked as read');
});

// POST /notifications/send — admin sends push/in-app to users or broadcast
const send = asyncHandler(async (req, res) => {
  const { title, body, type = 'admin_message', data = null, userIds, broadcast } = req.body;

  let targetIds = userIds || [];
  if (broadcast) {
    const users = await db.User.findAll({ attributes: ['id'] });
    targetIds = users.map((u) => u.id);
  }
  if (!targetIds.length) throw ApiError.badRequest('No recipients specified');

  const result = await notificationService.notifyMany({
    userIds: targetIds,
    type,
    title,
    body,
    data,
    channel: 'push',
  });
  return created(res, result, `Notification sent to ${result.count} user(s)`);
});

// POST /notifications/register-token — store device FCM token for current user
const registerToken = asyncHandler(async (req, res) => {
  const user = await db.User.findByPk(req.user.id);
  await user.update({ fcmToken: req.body.fcmToken });
  return ok(res, null, 'Device token registered');
});

module.exports = { list, markRead, markAllRead, send, registerToken };
