const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');

router.use(authenticate);

router.get('/stats', hasPermission('dashboard.view'), ctrl.stats);
router.get('/charts', hasPermission('dashboard.view'), ctrl.charts);

module.exports = router;
