const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/roles', require('./role.routes'));
router.use('/permissions', require('./permission.routes'));
router.use('/recovery', require('./recovery.routes'));
router.use('/vehicles', require('./vehicle.routes'));
router.use('/wallets', require('./wallet.routes'));
router.use('/withdrawals', require('./withdrawal.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/settings', require('./setting.routes'));
router.use('/companies', require('./company.routes'));
router.use('/audit-logs', require('./auditLog.routes'));

// Mobile app routes
router.use('/mobile', require('./otp.routes'));
router.use('/mobile/profile', require('./profile.routes'));
router.use('/mobile/tower', require('./tower.routes'));
router.use('/mobile/rides', require('./ride.routes'));
router.use('/mobile/rides/:rideId/messages', require('./chat.routes'));
router.use('/dashboard', require('./dashboard.routes'));

router.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', uptime: process.uptime() })
);

module.exports = router;
