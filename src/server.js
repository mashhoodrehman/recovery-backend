const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const db = require('./models');

async function start() {
  try {
    await db.sequelize.authenticate();
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Unable to connect to database', { err });
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`${env.appName} listening on http://localhost:${env.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      try {
        await db.sequelize.close();
      } catch (err) {
        logger.error('Error closing DB connection', { err });
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err });
    process.exit(1);
  });
}

start();
