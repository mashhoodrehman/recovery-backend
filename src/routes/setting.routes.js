const router = require('express').Router();
const ctrl = require('../controllers/setting.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/setting.validator');

// Public settings are readable without auth (mobile app bootstrap)
router.get('/public', ctrl.publicSettings);

router.use(authenticate);
router.get('/', hasPermission('settings.view'), ctrl.list);
router.put('/', hasPermission('settings.update'), validate(v.update), ctrl.update);

module.exports = router;
