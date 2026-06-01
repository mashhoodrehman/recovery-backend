# Recovery Backend

Node.js MVC backend for the towing / vehicle recovery / roadside-assistance marketplace.
Express + Sequelize + MySQL with Spatie-style roles & permissions, JWT (access + refresh),
a full bidding + job lifecycle, wallet & withdrawal system, FCM-ready notifications,
audit logging, settings, Swagger docs, and a sanitized Winston logger.

## Stack

- **Express 4**, **Sequelize 6**, **MySQL 8**
- **JWT** access + refresh tokens
- **bcryptjs** for password hashing
- **Joi** request validation
- **Winston + daily rotation** with field redaction
- **Nodemailer** for password reset emails
- **Firebase Cloud Messaging** (optional, lazy-loaded) for push
- **swagger-ui-express** interactive API docs at `/api/docs`
- **Helmet, CORS, rate limiting, compression**

## Modules

| Domain | Endpoints |
| --- | --- |
| Auth | signup, login, refresh, forgot/reset password, me, logout |
| RBAC | users, roles, permissions (group-aware) |
| Recovery | requests, bids, accept/withdraw, start, complete (full job lifecycle) |
| Vehicles | CRUD with owner-scoping + fleet management |
| Wallet | balances (total/available/pending), transaction ledger, manual adjustment |
| Withdrawals | request, approve, reject, mark-paid (wallet-integrated) |
| Notifications | in-app + push, mark read, broadcast/send, device-token registration |
| Settings | grouped key/value config, public bootstrap endpoint |
| Dashboard | aggregate stats + chart series |
| Audit Logs | automatic activity log of all mutations |

### Money flow

On job **completion** the accepted bid amount is credited to the provider's wallet as
`job_earning`, and the platform commission (`commission_percent` setting, default 10%) is
deducted as `commission_deduction`. Commission rows are summed as platform revenue on the
dashboard. **Withdrawals** move funds available → pending on request, release pending on
payout, or return them to available on rejection — every movement recorded as a transaction.

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
- `POST /recovery/requests/:id/start` — assigned provider marks in-progress
- `POST /recovery/requests/:id/complete` — settles wallet + commission, marks complete

### Vehicles
- `GET|POST /vehicles`, `GET|PUT|DELETE /vehicles/:id` (owner-scoped; `vehicles.manage.any` for all fleets)

### Wallet
- `GET /wallets/me`, `GET /wallets/transactions`, `GET /wallets/:userId`
- `POST /wallets/adjust` — manual admin credit/debit

### Withdrawals
- `GET|POST /withdrawals`, `GET /withdrawals/:id`
- `POST /withdrawals/:id/approve | /paid | /reject`

### Notifications
- `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`
- `POST /notifications/register-token`, `POST /notifications/send` (admin broadcast)

### Settings / Dashboard / Audit
- `GET /settings/public` (no auth), `GET|PUT /settings`
- `GET /dashboard/stats`, `GET /dashboard/charts`
- `GET /audit-logs`

## API documentation

- Interactive Swagger UI: `GET /api/docs`
- Raw OpenAPI spec: `GET /api/docs.json`
- Postman collection: `docs/postman_collection.json` (set `{{baseUrl}}`, run **Auth → Login** to auto-store the token)

## Push notifications (FCM)

Push delivery is optional and lazy-loaded. Without `FIREBASE_*` env vars set, notifications
are still persisted in-app and pushes are logged (mock). To enable real delivery:
`npm i firebase-admin` and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

## Logging

`src/utils/logger.js` redacts sensitive keys (password, token, secret, etc.) before writing to console, app log, and error log. Daily-rotated files land in `LOG_DIR` (default `logs/`).
# recovery-backend
