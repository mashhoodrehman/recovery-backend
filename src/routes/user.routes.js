const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/user.validator');

router.use(authenticate);

router.get('/', hasPermission('users.view'), validate(v.list), ctrl.list);
router.get('/:id', hasPermission('users.view'), validate(v.idParam), ctrl.getOne);
router.post('/', hasPermission('users.create'), validate(v.create), ctrl.create);
router.put('/:id', hasPermission('users.update'), validate(v.update), ctrl.update);
router.delete('/:id', hasPermission('users.delete'), validate(v.idParam), ctrl.remove);

module.exports = router;
