# Recovery Backend

Node.js MVC backend for the recovery system. Express + Sequelize + MySQL with Spatie-style roles & permissions, JWT (access + refresh), and a sanitized Winston logger.

## Stack

- **Express 4**, **Sequelize 6**, **MySQL 8**
- **JWT** access + refresh tokens
- **bcryptjs** for password hashing
- **Joi** request validation
- **Winston + daily rotation** with field redaction
- **Nodemailer** for password reset emails
- **Helmet, CORS, rate limiting, compression**

## Folder layout

```
src/
  app.js                # Express wiring (middleware, routes, error handler)
  server.js             # Boot + graceful shutdown
  config/
    env.js              # Typed env config
    sequelize.config.js # sequelize-cli config
  models/               # Sequelize models (User, Role, Permission, ...)
  migrations/           # SQL schema migrations
  seeders/              # Permissions, roles, default admin
  controllers/          # Thin HTTP layer
  services/             # Business logic (auth.service, mailer.service)
  routes/               # Route declarations per resource
  validators/           # Joi schemas
  middlewares/          # auth / permission / validate / error / requestContext
  utils/                # logger, jwt, password, ApiError, asyncHandler, apiResponse
```

## Setup

```bash
cp .env.example .env
# edit DB and SMTP creds
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Default admin (override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env at seed time):
- email: `admin@recovery.local`
- password: `Admin@12345`

## REST API (v1)

Base URL: `/api/v1`

### Auth
- `POST /auth/signup` — register customer or recovery-provider
- `POST /auth/login` — issue access + refresh tokens
- `POST /auth/refresh` — exchange refresh for new tokens
- `POST /auth/forgot-password` — email reset link
- `POST /auth/reset-password` — consume reset token
- `GET  /auth/me` — current user + flat permissions list (auth required)
- `POST /auth/logout` — invalidate refresh token (auth required)

### Users / Roles / Permissions
RBAC-gated. See `recovery` permission group for the recovery-specific actions.

### Recovery
- `POST /recovery/requests` — customer creates a request
- `GET  /recovery/requests` — providers list open requests, customers see their own
- `GET  /recovery/requests/:id` — request detail with bids
- `POST /recovery/requests/:id/cancel` — requester cancels
- `POST /recovery/requests/:id/bids` — provider bids
- `POST /recovery/requests/:id/bids/:bidId/accept` — requester accepts
- `POST /recovery/requests/:id/bids/:bidId/withdraw` — bidder withdraws
- `POST /recovery/requests/:id/complete` — admin/operator marks complete

## Logging

`src/utils/logger.js` redacts sensitive keys (password, token, secret, etc.) before writing to console, app log, and error log. Daily-rotated files land in `LOG_DIR` (default `logs/`).
# recovery-backend
