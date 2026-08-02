const path = require('path');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const stripeService = require('../services/stripe.service');
const env = require('../config/env');

// Documents required per country for tower drivers
const REQUIRED_DOCS = {
  UK: {
    driving_license:            'Full UK Driving Licence (Category C or C+E for vehicles over 3.5t)',
    vehicle_insurance:          'Commercial Vehicle Insurance with Recovery/Towing Cover',
    mot_certificate:            'MOT Certificate (current, valid)',
    operators_license:          "Operator's Licence (O-licence) — required for vehicles over 3.5 tonnes",
    cpc_certificate:            'Driver CPC (Certificate of Professional Competence)',
    public_liability_insurance: 'Public Liability Insurance',
    vehicle_photo:              'Clear photo of your tow truck / recovery vehicle',
    profile_photo:              'Recent profile photo',
  },
  PK: {
    cnic_front:           'CNIC Front Side (Computerised National Identity Card)',
    cnic_back:            'CNIC Back Side',
    driving_license:      'Pakistani Driving Licence',
    vehicle_registration: 'Vehicle Registration Certificate (car/truck papers)',
    fitness_certificate:  'Vehicle Fitness Certificate (from MTMIS / regional authority)',
    vehicle_photo:        'Clear photo of your tow truck',
    profile_photo:        'Recent profile photo',
  },
};

function buildFileUrl(req, filePath) {
  const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return `${base}/${rel}`;
}

// PATCH /mobile/profile
const updateProfile = asyncHandler(async (req, res) => {
  const updates = {};
  const { username, city, country, fcmToken } = req.body;

  if (username) updates.username = username;
  if (city) updates.city = city;
  if (country) {
    if (!['UK', 'PK'].includes(country)) throw ApiError.badRequest('country must be UK or PK');
    updates.country = country;
  }
  // Sent by the app on login / app start / whenever FCM issues a new token
  if (fcmToken) updates.fcmToken = fcmToken;
  if (req.file) {
    updates.avatar = buildFileUrl(req, req.file.path);
  }

  await req.user.update(updates);

  const user = await db.User.findByPk(req.user.id, {
    attributes: ['id', 'phone', 'username', 'userType', 'city', 'country', 'avatar',
                 'isProfileComplete', 'isOnline', 'isPhoneVerified'],
  });

  return ok(res, user, 'Profile updated');
});

// POST /mobile/profile/switch-role
const switchRole = asyncHandler(async (req, res) => {
  const { userType } = req.body;
  if (!['customer', 'tower'].includes(userType)) {
    throw ApiError.badRequest('userType must be customer or tower');
  }

  // If switching to tower, check if already online as tower — prevent switch mid-ride
  if (req.user.userType === 'tower' && req.user.isOnline) {
    throw ApiError.conflict('Go offline before switching role');
  }

  await req.user.update({ userType, isOnline: false });

  // If switching to tower, tell them what docs are needed
  let docsRequired = null;
  if (userType === 'tower') {
    const country = req.user.country || 'UK';
    const existing = await db.TowerDocument.findAll({
      where: { towerId: req.user.id },
      attributes: ['docType', 'status'],
    });
    const uploaded = existing.reduce((m, d) => { m[d.docType] = d.status; return m; }, {});
    const required = REQUIRED_DOCS[country] || REQUIRED_DOCS.UK;
    docsRequired = Object.entries(required).map(([type, label]) => ({
      docType: type,
      label,
      status: uploaded[type] || 'missing',
    }));
  }

  return ok(res, {
    userType,
    docsRequired,
    message: userType === 'tower'
      ? 'Switched to tower mode. Please upload your verification documents.'
      : 'Switched to customer mode',
  }, 'Role switched');
});

// GET /mobile/tower/documents
const getDocuments = asyncHandler(async (req, res) => {
  const country = req.user.country || 'UK';
  const required = REQUIRED_DOCS[country] || REQUIRED_DOCS.UK;

  const existing = await db.TowerDocument.findAll({
    where: { towerId: req.user.id },
    order: [['createdAt', 'DESC']],
  });

  const uploaded = existing.reduce((m, d) => { m[d.docType] = d; return m; }, {});

  const checklist = Object.entries(required).map(([type, label]) => {
    const doc = uploaded[type];
    return {
      docType: type,
      label,
      status: doc ? doc.status : 'missing',
      docUrl: doc ? doc.docUrl : null,
      rejectionReason: doc ? doc.rejectionReason : null,
      uploadedAt: doc ? doc.createdAt : null,
    };
  });

  const totalRequired = checklist.length;
  const approved = checklist.filter((d) => d.status === 'approved').length;
  const pending = checklist.filter((d) => d.status === 'pending').length;
  const missing = checklist.filter((d) => d.status === 'missing').length;

  return ok(res, {
    country,
    allApproved: approved === totalRequired,
    summary: { totalRequired, approved, pending, missing },
    checklist,
  });
});

// POST /mobile/tower/documents  (multipart: field name = "document", body field = "docType")
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const { docType } = req.body;

  const country = req.user.country || 'UK';
  const required = REQUIRED_DOCS[country] || REQUIRED_DOCS.UK;

  if (!required[docType]) {
    throw ApiError.badRequest(`Invalid docType for country ${country}. Valid types: ${Object.keys(required).join(', ')}`);
  }

  const docUrl = buildFileUrl(req, req.file.path);

  // Upsert — replace previous upload for the same docType (re-submission after rejection)
  const [doc, created] = await db.TowerDocument.findOrCreate({
    where: { towerId: req.user.id, docType },
    defaults: { towerId: req.user.id, country, docType, docUrl, status: 'pending' },
  });

  if (!created) {
    await doc.update({ docUrl, country, status: 'pending', rejectionReason: null });
  }

  return ok(res, {
    docType,
    label: required[docType],
    docUrl,
    status: 'pending',
  }, 'Document uploaded — pending admin review');
});

// PATCH /admin/tower-documents/:id  (admin approves/rejects)
const reviewDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw ApiError.badRequest('status must be approved or rejected');
  }

  const doc = await db.TowerDocument.findByPk(id);
  if (!doc) throw ApiError.notFound('Document not found');

  await doc.update({
    status,
    rejectionReason: status === 'rejected' ? (rejectionReason || 'Document rejected') : null,
  });

  return ok(res, doc, `Document ${status}`);
});

// POST /mobile/profile/stripe/onboard  (tower only) — creates/reuses a Stripe Connect
// Express account and returns a one-time onboarding link for the app to open in a webview.
const stripeOnboard = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'tower') throw ApiError.forbidden('Only towers can onboard for payouts');

  let accountId = req.user.stripeAccountId;
  if (!accountId) {
    const account = await stripeService.createConnectAccount(req.user.email);
    accountId = account.id;
    await req.user.update({ stripeAccountId: accountId });
  }

  // Flutter can pass its own deep links; falls back to a plain landing page otherwise.
  const returnUrl = req.query.returnUrl || `${env.appUrl}/api/v1/mobile/profile/stripe/return`;
  const refreshUrl = req.query.refreshUrl || returnUrl;
  const link = await stripeService.createAccountLink(accountId, { refreshUrl, returnUrl });

  return ok(res, { url: link.url, accountId }, 'Open this URL to complete Stripe onboarding');
});

// GET /mobile/profile/stripe/status
const stripeStatus = asyncHandler(async (req, res) => {
  return ok(res, {
    stripeAccountId: req.user.stripeAccountId,
    onboardingComplete: req.user.stripeOnboardingComplete,
    payoutsEnabled: req.user.stripePayoutsEnabled,
  });
});

// GET /mobile/profile/stripe/return — public landing page after the onboarding webview redirects back.
// Stripe requires a reachable return_url; the actual status flip happens via the `account.updated` webhook.
const stripeReturn = (_req, res) => {
  res.send(
    '<html><body style="font-family:sans-serif;text-align:center;padding-top:60px">' +
    '<h2>Stripe onboarding complete</h2><p>You can close this window and return to the app.</p>' +
    '</body></html>'
  );
};

module.exports = {
  updateProfile, switchRole, getDocuments, uploadDocument, reviewDocument,
  stripeOnboard, stripeStatus, stripeReturn,
};
