const router = require('express').Router();
const ctrl = require('../controllers/otp.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const v = require('../validators/otp.validator');

router.post('/send', validate(v.sendOtp), ctrl.sendOtp);
router.post('/verify', validate(v.verifyOtp), ctrl.verifyOtp);
router.post('/profile/setup', authenticate, validate(v.setupProfile), ctrl.setupProfile);
router.get('/profile', authenticate, ctrl.getProfile);

module.exports = router;
