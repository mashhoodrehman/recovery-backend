const router = require('express').Router();
const ctrl = require('../controllers/auditLog.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');

router.use(authenticate);
router.get('/', hasPermission('audit.view'), ctrl.list);

module.exports = router;
