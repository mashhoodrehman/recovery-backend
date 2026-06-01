const router = require('express').Router();
const ctrl = require('../controllers/wallet.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/wallet.validator');

router.use(authenticate);

router.get('/me', hasPermission('wallets.view.own', 'wallets.view.any'), ctrl.myWallet);
router.get(
  '/transactions',
  hasPermission('wallets.view.own', 'wallets.view.any'),
  validate(v.listTransactions),
  ctrl.listTransactions
);
router.post('/adjust', hasPermission('wallets.adjust'), validate(v.adjust), ctrl.adjust);
router.get(
  '/:userId',
  hasPermission('wallets.view.own', 'wallets.view.any'),
  validate(v.userIdParam),
  ctrl.getWallet
);

module.exports = router;
