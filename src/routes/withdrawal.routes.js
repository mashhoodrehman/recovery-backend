const router = require('express').Router();
const ctrl = require('../controllers/withdrawal.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/withdrawal.validator');

router.use(authenticate);

router.get(
  '/',
  hasPermission('withdrawals.view.own', 'withdrawals.manage'),
  validate(v.list),
  ctrl.list
);
router.post('/', hasPermission('withdrawals.create'), validate(v.create), ctrl.create);
router.get(
  '/:id',
  hasPermission('withdrawals.view.own', 'withdrawals.manage'),
  validate(v.idParam),
  ctrl.getOne
);
router.post('/:id/approve', hasPermission('withdrawals.manage'), validate(v.idParam), ctrl.approve);
router.post('/:id/paid', hasPermission('withdrawals.manage'), validate(v.idParam), ctrl.markPaid);
router.post('/:id/reject', hasPermission('withdrawals.manage'), validate(v.reject), ctrl.reject);

module.exports = router;
