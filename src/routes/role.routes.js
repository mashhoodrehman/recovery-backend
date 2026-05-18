const router = require('express').Router();
const ctrl = require('../controllers/role.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/role.validator');

router.use(authenticate);

router.get('/', hasPermission('roles.view'), validate(v.list), ctrl.list);
router.get('/:id', hasPermission('roles.view'), validate(v.idParam), ctrl.getOne);
router.post('/', hasPermission('roles.create'), validate(v.create), ctrl.create);
router.put('/:id', hasPermission('roles.update'), validate(v.update), ctrl.update);
router.delete('/:id', hasPermission('roles.delete'), validate(v.idParam), ctrl.remove);

module.exports = router;
