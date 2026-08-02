const router = require('express').Router();
const ctrl = require('../controllers/tower.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/ride.validator');

router.use(authenticate);

router.post('/online', validate(v.locationUpdate), ctrl.goOnline);
router.post('/offline', ctrl.goOffline);
router.patch('/location', validate(v.locationUpdate), ctrl.updateLocation);
router.get('/nearby', ctrl.nearby);

module.exports = router;
