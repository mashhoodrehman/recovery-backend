/**
 * OpenAPI spec + Swagger UI wiring.
 *
 * The spec itself is a plain object (no build step). swagger-ui-express is
 * optional: if it isn't installed the app still boots and /api/docs.json keeps
 * serving the raw spec, while /api/docs returns a friendly hint.
 */
const env = require('../config/env');

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Recovery Marketplace API',
    version: '1.0.0',
    description:
      'Towing, vehicle recovery, roadside assistance and transportation marketplace API. ' +
      'All responses follow `{ success, message, data, meta? }`.',
  },
  servers: [{ url: `${env.appUrl}/api/v1`, description: env.nodeEnv }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Roles' },
    { name: 'Permissions' },
    { name: 'Recovery Requests' },
    { name: 'Vehicles' },
    { name: 'Wallets' },
    { name: 'Withdrawals' },
    { name: 'Notifications' },
    { name: 'Settings' },
    { name: 'Dashboard' },
    { name: 'Audit Logs' },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@recovery.local' },
                  password: { type: 'string', example: 'Admin@12345' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Authenticated' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Current user + permissions', responses: { 200: { description: 'OK' } } },
    },
    '/dashboard/stats': {
      get: { tags: ['Dashboard'], summary: 'Aggregated platform stats', responses: { 200: { description: 'OK' } } },
    },
    '/dashboard/charts': {
      get: { tags: ['Dashboard'], summary: 'Chart series for the dashboard', responses: { 200: { description: 'OK' } } },
    },
    '/recovery/requests': {
      get: { tags: ['Recovery Requests'], summary: 'List requests', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Recovery Requests'], summary: 'Create a request', responses: { 201: { description: 'Created' } } },
    },
    '/recovery/requests/{id}/bids': {
      post: { tags: ['Recovery Requests'], summary: 'Place a bid', responses: { 201: { description: 'Created' } } },
    },
    '/vehicles': {
      get: { tags: ['Vehicles'], summary: 'List vehicles', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Vehicles'], summary: 'Create vehicle', responses: { 201: { description: 'Created' } } },
    },
    '/wallets/me': {
      get: { tags: ['Wallets'], summary: 'My wallet', responses: { 200: { description: 'OK' } } },
    },
    '/wallets/transactions': {
      get: { tags: ['Wallets'], summary: 'Wallet ledger', responses: { 200: { description: 'OK' } } },
    },
    '/withdrawals': {
      get: { tags: ['Withdrawals'], summary: 'List withdrawals', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Withdrawals'], summary: 'Request a withdrawal', responses: { 201: { description: 'Created' } } },
    },
    '/notifications': {
      get: { tags: ['Notifications'], summary: 'My notifications', responses: { 200: { description: 'OK' } } },
    },
    '/notifications/send': {
      post: { tags: ['Notifications'], summary: 'Send/broadcast a notification', responses: { 201: { description: 'Sent' } } },
    },
    '/settings': {
      get: { tags: ['Settings'], summary: 'Grouped settings', responses: { 200: { description: 'OK' } } },
      put: { tags: ['Settings'], summary: 'Bulk update settings', responses: { 200: { description: 'OK' } } },
    },
    '/audit-logs': {
      get: { tags: ['Audit Logs'], summary: 'Activity log', responses: { 200: { description: 'OK' } } },
    },
  },
};

let swaggerUi;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  swaggerUi = require('swagger-ui-express');
} catch {
  // Lightweight fallback so the app boots without the optional dependency.
  const hint = (_req, res) =>
    res.status(200).json({
      success: true,
      message: 'Install "swagger-ui-express" for the interactive UI. Raw spec at /api/docs.json',
    });
  swaggerUi = { serve: [(_req, _res, nextFn) => nextFn()], setup: () => hint };
}

module.exports = { swaggerUi, swaggerSpec };
