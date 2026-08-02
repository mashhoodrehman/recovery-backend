const router = require('express').Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { uploadProfile, uploadDocument } = require('../middleware/upload.middleware');
const {
  updateProfile, switchRole, getDocuments, uploadDocument: uploadDoc, reviewDocument,
  stripeOnboard, stripeStatus, stripeReturn,
} = require('../controllers/profile.controller');

// Profile
router.patch('/', authenticate, uploadProfile.single('avatar'), updateProfile);
router.post('/switch-role', authenticate, switchRole);

// Tower document verification
router.get('/tower/documents', authenticate, getDocuments);
router.post('/tower/documents', authenticate, uploadDocument.single('document'), uploadDoc);

// Admin review (add permission check if needed)
router.patch('/admin/tower-documents/:id', authenticate, reviewDocument);

// Stripe Connect payout onboarding (tower)
router.post('/stripe/onboard', authenticate, stripeOnboard);
router.get('/stripe/status', authenticate, stripeStatus);
router.get('/stripe/return', stripeReturn); // public — Stripe redirects here after the webview

module.exports = router;
