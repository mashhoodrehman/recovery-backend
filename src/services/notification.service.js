const db = require('../models');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Push delivery via Firebase Cloud Messaging.
 *
 * Kept dependency-free: if firebase-admin + service account are configured it
 * sends, otherwise it logs (so the rest of the system works in dev). To enable,
 * install `firebase-admin`, set FIREBASE_* env vars, and the lazy init below
 * will pick them up.
 */
let messaging = null;
let fcmInitTried = false;

const getMessaging = () => {
  if (fcmInitTried) return messaging;
  fcmInitTried = true;
  if (!env.fcm || !env.fcm.projectId) return null;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.fcm.projectId,
          clientEmail: env.fcm.clientEmail,
          privateKey: (env.fcm.privateKey || '').replace(/\\n/g, '\n'),
        }),
      });
    }
    messaging = admin.messaging();
  } catch (err) {
    logger.warn(`FCM not available: ${err.message}`);
    messaging = null;
  }
  return messaging;
};

const sendPush = async (tokens, payload) => {
  const list = (Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean);
  if (!list.length) return { sent: 0 };
  const fcm = getMessaging();
  if (!fcm) {
    logger.debug(`[push:mock] -> ${list.length} device(s): ${payload.title}`);
    return { sent: 0, mocked: true };
  }
  try {
    const response = await fcm.sendEachForMulticast({
      tokens: list,
      notification: { title: payload.title, body: payload.body },
      data: Object.fromEntries(
        Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
      ),
    });
    return { sent: response.successCount };
  } catch (err) {
    logger.error(`Push send failed: ${err.message}`);
    return { sent: 0, error: err.message };
  }
};

/**
 * Persist a notification and (best-effort) push it to the user's devices.
 */
const notify = async ({ userId, type, title, body, data = null, channel = 'in_app' }) => {
  const notification = await db.Notification.create({ userId, type, title, body, data, channel });

  // Fire-and-forget push (never block the request on delivery)
  (async () => {
    try {
      const user = await db.User.findByPk(userId, { attributes: ['id', 'fcmToken'] });
      if (user && user.fcmToken) {
        await sendPush(user.fcmToken, { title, body, data });
      }
    } catch (err) {
      logger.error(`notify push error: ${err.message}`);
    }
  })();

  return notification;
};

// Send the same notification to many users (broadcast)
const notifyMany = async ({ userIds, type, title, body, data = null, channel = 'in_app' }) => {
  if (!userIds || !userIds.length) return { count: 0 };
  const rows = userIds.map((userId) => ({ userId, type, title, body, data, channel }));
  await db.Notification.bulkCreate(rows);

  (async () => {
    try {
      const users = await db.User.findAll({
        where: { id: userIds },
        attributes: ['id', 'fcmToken'],
      });
      const tokens = users.map((u) => u.fcmToken).filter(Boolean);
      if (tokens.length) await sendPush(tokens, { title, body, data });
    } catch (err) {
      logger.error(`notifyMany push error: ${err.message}`);
    }
  })();

  return { count: rows.length };
};

module.exports = { notify, notifyMany, sendPush };
