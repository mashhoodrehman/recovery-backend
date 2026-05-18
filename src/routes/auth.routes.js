const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const v = require('../validators/auth.validator');

router.post('/signup', validate(v.signup), ctrl.signup);
router.post('/login', validate(v.login), ctrl.login);
router.post('/refresh', validate(v.refresh), ctrl.refresh);
router.post('/forgot-password', validate(v.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validate(v.resetPassword), ctrl.resetPassword);

router.use(authenticate);
router.get('/me', ctrl.me);
router.post('/logout', ctrl.logout);

module.exports = router;
