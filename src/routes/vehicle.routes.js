const router = require('express').Router();
const ctrl = require('../controllers/vehicle.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/vehicle.validator');

router.use(authenticate);

router.get(
  '/',
  hasPermission('vehicles.view.own', 'vehicles.manage.any'),
  validate(v.list),
  ctrl.list
);
router.get(
  '/:id',
  hasPermission('vehicles.view.own', 'vehicles.manage.any'),
  validate(v.idParam),
  ctrl.getOne
);
router.post(
  '/',
  hasPermission('vehicles.create', 'vehicles.manage.any'),
  validate(v.create),
  ctrl.create
);
router.put(
  '/:id',
  hasPermission('vehicles.update', 'vehicles.manage.any'),
  validate(v.update),
  ctrl.update
);
router.delete(
  '/:id',
  hasPermission('vehicles.delete', 'vehicles.manage.any'),
  validate(v.idParam),
  ctrl.remove
);

module.exports = router;
