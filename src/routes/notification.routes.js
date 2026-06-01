const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/notification.validator');

router.use(authenticate);

router.get('/', validate(v.list), ctrl.list);
router.post('/read-all', ctrl.markAllRead);
router.post('/:id/read', validate(v.idParam), ctrl.markRead);
router.post('/register-token', validate(v.registerToken), ctrl.registerToken);
router.post('/send', hasPermission('notifications.send'), validate(v.send), ctrl.send);

module.exports = router;
