const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/roles', require('./role.routes'));
router.use('/permissions', require('./permission.routes'));
router.use('/recovery', require('./recovery.routes'));

router.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', uptime: process.uptime() })
);

module.exports = router;
