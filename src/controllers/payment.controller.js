const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const stripeService = require('../services/stripe.service');
const settingsService = require('../services/settings.service');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

// POST /mobile/rides/:id/pay  — customer creates/reuses a PaymentIntent for the ride fare.
// Gates ride:start (see ride.controller.js#startRide) — the tower cannot start until the
// webhook below confirms payment_intent.succeeded.
const createRidePayment = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.customerId !== req.user.id) throw ApiError.forbidden('Not your ride');
  if (!ride.fareAmount) throw ApiError.badRequest('Ride has no agreed fare yet — accept a bid first');
  if (ride.paymentStatus === 'paid') throw ApiError.conflict('Ride is already paid');

  const currency = await settingsService.get('currency');

  // Reuse an existing pending intent instead of creating duplicates on retry.
  if (ride.stripePaymentIntentId && ride.paymentStatus === 'pending') {
    const stripe = stripeService.getStripe();
    const existing = stripe && (await stripe.paymentIntents.retrieve(ride.stripePaymentIntentId));
    if (existing && existing.status !== 'canceled') {
      return ok(res, { clientSecret: existing.client_secret, paymentIntentId: existing.id, currency }, 'Payment intent ready');
    }
  }

  const intent = await stripeService.createPaymentIntent({
    amount: ride.fareAmount,
    currency,
    metadata: { rideId: String(ride.id), customerId: String(ride.customerId) },
  });

  await ride.update({ stripePaymentIntentId: intent.id, paymentStatus: 'pending' });

  return ok(res, { clientSecret: intent.client_secret, paymentIntentId: intent.id, currency }, 'Payment intent created');
});

// GET /mobile/rides/:id/payment  — poll payment status (fallback if the webhook/socket event is missed)
const getRidePaymentStatus = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id, {
    attributes: ['id', 'customerId', 'towerId', 'paymentStatus', 'stripePaymentIntentId', 'fareAmount', 'paidAt'],
  });
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.customerId !== req.user.id && ride.towerId !== req.user.id) {
    throw ApiError.forbidden('Not your ride');
  }
  return ok(res, ride);
});

// POST /payments/stripe/webhook  — public, verified by Stripe signature. Mounted with a raw
// body parser in app.js (must run BEFORE the global express.json()).
const stripeWebhook = async (req, res) => {
  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(req.app.get('io'), event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(req.app.get('io'), event.data.object);
        break;
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    // Stripe retries on non-2xx; log and ack anyway once we've reached here so it doesn't
    // hammer us for an error that's on our side, not theirs.
    logger.error(`Stripe webhook handler error (${event.type}): ${err.message}`, { err });
  }

  return res.json({ received: true });
};

async function handlePaymentSucceeded(io, paymentIntent) {
  const ride = await db.Ride.findOne({ where: { stripePaymentIntentId: paymentIntent.id } });
  if (!ride) return;
  if (ride.paymentStatus === 'paid') return; // already processed (webhook can be delivered more than once)

  await ride.update({ paymentStatus: 'paid', paidAt: new Date() });

  if (io) io.to(`ride:${ride.id}`).emit('ride:payment_confirmed', { rideId: ride.id });

  await Promise.all([
    notificationService.notify({
      userId: ride.customerId,
      type: 'payment_confirmed',
      title: 'Payment confirmed',
      body: 'Your payment was received. The ride can now start.',
      data: { rideId: ride.id },
    }),
    ride.towerId
      ? notificationService.notify({
          userId: ride.towerId,
          type: 'payment_confirmed',
          title: 'Payment received',
          body: 'The customer has paid — you can start the ride.',
          data: { rideId: ride.id },
        })
      : Promise.resolve(),
  ]);
}

async function handlePaymentFailed(io, paymentIntent) {
  const ride = await db.Ride.findOne({ where: { stripePaymentIntentId: paymentIntent.id } });
  if (!ride) return;

  await ride.update({ paymentStatus: 'failed' });
  if (io) io.to(`ride:${ride.id}`).emit('ride:payment_failed', { rideId: ride.id });

  await notificationService.notify({
    userId: ride.customerId,
    type: 'payment_failed',
    title: 'Payment failed',
    body: 'Your payment could not be processed. Please try again.',
    data: { rideId: ride.id },
  });
}

async function handleAccountUpdated(account) {
  const user = await db.User.findOne({ where: { stripeAccountId: account.id } });
  if (!user) return;

  await user.update({
    stripeOnboardingComplete: !!account.details_submitted,
    stripePayoutsEnabled: !!account.payouts_enabled,
  });
}

module.exports = { createRidePayment, getRidePaymentStatus, stripeWebhook };
