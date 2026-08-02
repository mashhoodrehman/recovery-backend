const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./utils/logger');
const routes = require('./routes');
const { requestContext } = require('./middlewares/requestContext.middleware');
const { auditLogger } = require('./middlewares/audit.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const { swaggerUi, swaggerSpec } = require('./docs/swagger');
const { stripeWebhook } = require('./controllers/payment.controller');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // allow all in dev; tighten in production
    credentials: true,
  })
);
app.use(compression());

// Stripe needs the raw (unparsed) body to verify the webhook signature — must be registered
// BEFORE the global express.json() below, and skips the rest of the JSON API pipeline entirely.
app.post('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContext);

app.use(
  '/api',
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Serve uploaded files (profile photos, documents, chat images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API documentation (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

app.use(auditLogger);
app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

logger.debug(`App initialized in ${env.nodeEnv} mode`);

module.exports = app;
