const router = require('express').Router();
const ctrl = require('../controllers/ride.controller');
const paymentCtrl = require('../controllers/payment.controller');
const ratingCtrl = require('../controllers/rating.controller');
const callCtrl = require('../controllers/call.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/ride.validator');

router.use(authenticate);

// Customer
router.post('/', validate(v.createRide), ctrl.createRide);
router.get('/', ctrl.listRides);
router.get('/admin/active', ctrl.adminActiveRides);
router.get('/:id', validate(v.idParam), ctrl.getRide);
router.post('/:id/cancel', validate(v.cancelRide), ctrl.cancelRide);

// Bidding
router.post('/:id/bids', validate(v.placeBid), ctrl.placeBid);
router.post('/:id/bids/:bidId/accept', validate(v.bidAction), ctrl.acceptBid);
router.post('/:id/bids/:bidId/reject', validate(v.bidAction), ctrl.rejectBid);

// Tower lifecycle
router.post('/:id/arrived', validate(v.idParam), ctrl.towerArrived);
router.post('/:id/start', validate(v.idParam), ctrl.startRide);
router.post('/:id/complete', validate(v.idParam), ctrl.completeRide);

// Tracking
router.get('/:id/tracking', validate(v.idParam), ctrl.getTracking);

// Payment (Stripe)
router.post('/:id/pay', validate(v.idParam), paymentCtrl.createRidePayment);
router.get('/:id/payment', validate(v.idParam), paymentCtrl.getRidePaymentStatus);

// Rating
router.post('/:id/rating', validate(v.rating), ratingCtrl.createRating);
router.get('/:id/rating', validate(v.idParam), ratingCtrl.getRating);

// Voice call (Agora)
router.get('/:id/call/token', validate(v.idParam), callCtrl.getCallToken);

module.exports = router;
