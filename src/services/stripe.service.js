const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

let stripeClient = null;
let initTried = false;

// Lazy init — same pattern as notification.service.js's firebase-admin hookup.
// Keeps the app bootable with Stripe fully unconfigured (e.g. local dev without keys).
const getStripe = () => {
  if (initTried) return stripeClient;
  initTried = true;
  if (!env.stripe.secretKey) {
    logger.warn('Stripe not configured (STRIPE_SECRET_KEY missing) — payment endpoints will fail');
    return null;
  }
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const Stripe = require('stripe');
  stripeClient = new Stripe(env.stripe.secretKey, { apiVersion: '2024-06-20' });
  return stripeClient;
};

const requireStripe = () => {
  const stripe = getStripe();
  if (!stripe) throw ApiError.internal('Payments are not configured on this server');
  return stripe;
};

// Amount is a decimal string/number in major currency units (e.g. 12.50); Stripe wants minor units.
const toMinorUnits = (amount) => Math.round(Number(amount) * 100);
const fromMinorUnits = (amount) => Number(amount) / 100;

const createPaymentIntent = async ({ amount, currency, metadata }) => {
  const stripe = requireStripe();
  return stripe.paymentIntents.create({
    amount: toMinorUnits(amount),
    currency: String(currency || 'usd').toLowerCase(),
    metadata,
    automatic_payment_methods: { enabled: true },
  });
};

const constructWebhookEvent = (rawBody, signature) => {
  const stripe = requireStripe();
  if (!env.stripe.webhookSecret) throw ApiError.internal('STRIPE_WEBHOOK_SECRET is not configured');
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
};

// Stripe Connect (Express) — vendor payout accounts
const createConnectAccount = async (email) => {
  const stripe = requireStripe();
  return stripe.accounts.create({
    type: 'express',
    email: email || undefined,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  });
};

const createAccountLink = async (accountId, { refreshUrl, returnUrl }) => {
  const stripe = requireStripe();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
};

const retrieveAccount = async (accountId) => {
  const stripe = requireStripe();
  return stripe.accounts.retrieve(accountId);
};

const createTransfer = async ({ amount, currency, destinationAccountId, metadata }) => {
  const stripe = requireStripe();
  return stripe.transfers.create({
    amount: toMinorUnits(amount),
    currency: String(currency || 'usd').toLowerCase(),
    destination: destinationAccountId,
    metadata,
  });
};

module.exports = {
  getStripe,
  createPaymentIntent,
  constructWebhookEvent,
  createConnectAccount,
  createAccountLink,
  retrieveAccount,
  createTransfer,
  toMinorUnits,
  fromMinorUnits,
};
