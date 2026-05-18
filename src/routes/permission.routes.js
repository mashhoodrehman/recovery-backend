const router = require('express').Router();
const ctrl = require('../controllers/permission.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/permission.validator');

router.use(authenticate);

router.get('/', hasPermission('permissions.view'), validate(v.list), ctrl.list);
router.get('/groups/all', hasPermission('permissions.view'), ctrl.groups);
router.get('/:id', hasPermission('permissions.view'), validate(v.idParam), ctrl.getOne);
router.post('/', hasPermission('permissions.create'), validate(v.create), ctrl.create);
router.put('/:id', hasPermission('permissions.update'), validate(v.update), ctrl.update);
router.delete('/:id', hasPermission('permissions.delete'), validate(v.idParam), ctrl.remove);

module.exports = router;
