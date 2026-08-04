const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const { signAccessToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');

const DEV_OTP = '1122'; // Replace with Twilio send in production
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// POST /mobile/otp/send
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  // In production: call Twilio here and send a random OTP
  // For now, always use 1122
  const otp = DEV_OTP;
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  let user = await db.User.findOne({ where: { phone } });
  if (!user) {
    // Create a minimal record — profile filled in later
    user = await db.User.create({
      phone,
      firstName: '',
      lastName: '',
      email: null,
      password: await bcrypt.hash(require('uuid').v4(), 6), // throwaway password
      isActive: true,
      phoneOtp: otp,
      phoneOtpExpiresAt: expiresAt,
      isPhoneVerified: false,
    });
  } else {
    await user.update({ phoneOtp: otp, phoneOtpExpiresAt: expiresAt });
  }

  // In production: do NOT return the otp — it goes to phone via SMS
  return ok(res, {
    message: 'OTP sent',
    // Remove 'otp' field in production — only here for dev/testing
    otp: process.env.NODE_ENV === 'production' ? undefined : otp,
    expiresAt,
  });
});

// POST /mobile/otp/verify
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  const user = await db.User.findOne({ where: { phone } });
  if (!user) throw ApiError.notFound('Phone not registered');

  if (user.phoneOtp !== otp) throw ApiError.badRequest('Invalid OTP');
  if (!user.phoneOtpExpiresAt || new Date() > user.phoneOtpExpiresAt) {
    throw ApiError.badRequest('OTP has expired');
  }

  await user.update({ isPhoneVerified: true, phoneOtp: null, phoneOtpExpiresAt: null });

  const accessToken = signAccessToken({ sub: user.id });

  return ok(res, {
    accessToken,
    isNewUser: !user.isProfileComplete,
    user: {
      id: user.id,
      phone: user.phone,
      username: user.username,
      userType: user.userType,       // 'customer' | 'tower' | null
      city: user.city,
      country: user.country || 'UK',
      avatar: user.avatar,
      isProfileComplete: user.isProfileComplete,
      isOnline: user.isOnline,
    },
    // Convenience flag — mobile app can immediately route to correct home screen
    mode: user.isProfileComplete ? user.userType : null,
  });
});

// POST /mobile/profile/setup  (requires auth)
const setupProfile = asyncHandler(async (req, res) => {
  const { username, userType, city, country } = req.body;

  if (!['customer', 'tower'].includes(userType)) {
    throw ApiError.badRequest('userType must be customer or tower');
  }
  if (country && !['UK', 'PK'].includes(country)) {
    throw ApiError.badRequest('country must be UK or PK');
  }

  await req.user.update({
    username,
    userType,
    city,
    country: country || 'UK',
    isProfileComplete: true,
  });

  // If registering as tower, return required document checklist
  let docsRequired = null;
  if (userType === 'tower') {
    docsRequired = (country || 'UK') === 'PK'
      ? ['cnic_front', 'cnic_back', 'driving_license', 'vehicle_registration', 'fitness_certificate', 'vehicle_photo', 'profile_photo']
      : ['driving_license', 'vehicle_insurance', 'mot_certificate', 'operators_license', 'cpc_certificate', 'public_liability_insurance', 'vehicle_photo', 'profile_photo'];
  }

  return ok(res, {
    id: req.user.id,
    phone: req.user.phone,
    username: req.user.username,
    userType: req.user.userType,
    city: req.user.city,
    country: req.user.country,
    isProfileComplete: true,
    docsRequired,
    nextStep: userType === 'tower'
      ? 'Please upload your verification documents at POST /mobile/tower/documents'
      : null,
  }, 'Profile setup complete');
});

// GET /mobile/profile  (requires auth)
const getProfile = asyncHandler(async (req, res) => {
  const user = await db.User.findByPk(req.user.id, {
    attributes: ['id', 'phone', 'username', 'userType', 'city', 'country', 'avatar',
                 'isProfileComplete', 'isPhoneVerified', 'isOnline', 'currentLat', 'currentLng'],
  });
  return ok(res, { ...user.toJSON(), mode: user.userType });
});

module.exports = { sendOtp, verifyOtp, setupProfile, getProfile };
