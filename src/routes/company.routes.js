const router = require('express').Router();
const ctrl = require('../controllers/company.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/company.validator');

router.use(authenticate);

router.get('/', hasPermission('companies.view', '*'), validate(v.list), ctrl.list);
router.get('/:id', hasPermission('companies.view', '*'), validate(v.idParam), ctrl.getOne);
router.post('/', hasPermission('companies.create', '*'), validate(v.create), ctrl.create);
router.put('/:id', hasPermission('companies.update', '*'), validate(v.update), ctrl.update);
router.delete('/:id', hasPermission('companies.delete', '*'), validate(v.idParam), ctrl.remove);

module.exports = router;
