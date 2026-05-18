const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.mail.host) {
    logger.warn('Mailer not configured (MAIL_HOST missing); emails will be logged only.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: env.mail.user
      ? { user: env.mail.user, pass: env.mail.password }
      : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const from = `"${env.mail.fromName}" <${env.mail.fromAddress}>`;
  const tx = getTransporter();
  if (!tx) {
    logger.info('Email (not sent — no transport)', { to, subject });
    return { skipped: true };
  }
  const info = await tx.sendMail({ from, to, subject, html, text });
  logger.info('Email sent', { to, subject, messageId: info.messageId });
  return info;
}

async function sendPasswordResetEmail(user, resetUrl) {
  const subject = `${env.appName} — password reset`;
  const html = `
    <p>Hi ${user.firstName || ''},</p>
    <p>You requested a password reset. Click the link below to set a new password. The link expires shortly.</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;
  const text = `Reset your password: ${resetUrl}`;
  return sendMail({ to: user.email, subject, html, text });
}

module.exports = { sendMail, sendPasswordResetEmail };
