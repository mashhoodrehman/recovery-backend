const router = require('express').Router();
const ctrl = require('../controllers/recovery.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/permission.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/recovery.validator');

router.use(authenticate);

// Recovery requests
router.post(
  '/requests',
  hasPermission('recovery.request.create'),
  validate(v.createRequest),
  ctrl.createRequest
);
router.get(
  '/requests',
  hasPermission('recovery.request.view.own', 'recovery.request.view.any'),
  validate(v.listRequests),
  ctrl.listRequests
);
router.get(
  '/requests/:id',
  hasPermission('recovery.request.view.own', 'recovery.request.view.any'),
  validate(v.idParam),
  ctrl.getRequest
);
router.post(
  '/requests/:id/cancel',
  hasPermission('recovery.request.cancel.own'),
  validate(v.idParam),
  ctrl.cancelRequest
);
router.post(
  '/requests/:id/complete',
  hasPermission('recovery.complete'),
  validate(v.idParam),
  ctrl.completeRequest
);

// Bidding
router.post(
  '/requests/:id/bids',
  hasPermission('recovery.bid.create'),
  validate(v.placeBid),
  ctrl.placeBid
);
router.post(
  '/requests/:id/bids/:bidId/accept',
  hasPermission('recovery.bid.accept'),
  validate(v.acceptBid),
  ctrl.acceptBid
);
router.post(
  '/requests/:id/bids/:bidId/withdraw',
  hasPermission('recovery.bid.withdraw'),
  validate(v.acceptBid),
  ctrl.withdrawBid
);

module.exports = router;
