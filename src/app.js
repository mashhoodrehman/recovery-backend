const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./utils/logger');
const routes = require('./routes');
const { requestContext } = require('./middlewares/requestContext.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(compression());
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

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

logger.debug(`App initialized in ${env.nodeEnv} mode`);

module.exports = app;
