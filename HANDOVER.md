# Recovery Backend — Handover

Last updated: 2026-08-07. Written for switching to a new laptop — covers everything needed to
pick this project back up cold, with no other context.

**This file contains no actual secrets** (SSH keys, DB passwords, API keys) — only which
env vars are set vs. missing, and where the real values live. Safe to commit.

---

## 0. Do this first on the new laptop

1. **Clone the repo** (already pushed, nothing local-only): `git clone git@github-personal:mashhoodrehman/recovery-backend.git`
2. **Copy `mmrserver.pem`** over from this laptop — it's at `/Users/mmr/Herd/mmrserver.pem`, chmod 600, and is the *only* way to SSH into the production server. Not in git (and shouldn't be). If it's lost, you'd need to add a new key via the AWS EC2 console.
3. **`recovery-frontend` (the admin panel source) could not be found anywhere on this laptop** — not at its expected path, not in Trash, not in iCloud, not indexed by Spotlight. The production server only ever had the *compiled build* of it (confirmed — no `.git`, no source there), so that's not a recovery path either. **Before wiping this laptop, check**: another machine, an external drive, Time Machine, or any GitHub remote it might have been pushed to that isn't referenced anywhere in this repo. If it's genuinely gone, the admin panel will need to be rebuilt from scratch or restored from a backup you find elsewhere.

---

## 1. What this is

A towing/recovery marketplace: **customers** request roadside recovery, **towers** (drivers/vendors)
bid, customer accepts, tower drives → arrives → starts → completes. Node/Express + Sequelize/MySQL
backend, Socket.IO for real-time (chat, live location, bidding), Flutter mobile app (customer +
tower) as the client — this repo is backend-only, the Flutter source isn't part of this handover.

## 2. Where everything lives

| | |
|---|---|
| This repo (local) | `/Users/mmr/Herd/recovery-backend` |
| Git remote | `git@github-personal:mashhoodrehman/recovery-backend.git`, branch `main` — **now fully pushed, no local-only commits** |
| Production server | AWS EC2, `3.226.65.68`, user `ubuntu`, SSH key `/Users/mmr/Herd/mmrserver.pem` |
| Deployed backend | `/var/www/recovery-backend` on the server |
| Deployed frontend (admin panel, build only) | `/var/www/recovery-frontend` on the server |
| pm2 process | `recovery-api` (only process on this box now) |
| Database | MySQL, db name `recovery_db`, bound to `127.0.0.1` on the server (not exposed externally) |
| Node version (server) | v20.20.2 |

SSH in:
```bash
ssh -i /Users/mmr/Herd/mmrserver.pem ubuntu@3.226.65.68
```

### Domains

Both old and new domains work — nginx has both as `server_name` aliases on the same vhosts, one
set of Let's Encrypt certs covers both:

| | New (primary) | Legacy (still works) |
|---|---|---|
| API | `https://api.recovernow.co.uk` | `https://recovery-api.laggarsay.com` |
| Socket.IO | `https://socket.recovernow.co.uk` | `https://recovery-socket.laggarsay.com` |
| Admin frontend | `https://app.recovernow.co.uk` | `https://recovery.laggarsay.com` |

Base API path is `/api/v1` on top of the API domain.

### How to deploy a change

No CI/CD — everything this session was deployed manually like this:

```bash
# 1. Push code
rsync -avz -c --exclude 'node_modules' --exclude '.env' --exclude '.env.save' --exclude '.git' \
  --exclude '.claude' --exclude 'logs' --exclude 'uploads' --exclude '.sequelizerc' \
  -e "ssh -i /Users/mmr/Herd/mmrserver.pem" \
  /Users/mmr/Herd/recovery-backend/ ubuntu@3.226.65.68:/var/www/recovery-backend/

# 2. If package.json changed, install on the server too
ssh -i /Users/mmr/Herd/mmrserver.pem ubuntu@3.226.65.68 "cd /var/www/recovery-backend && npm install"

# 3. If a new migration was added
ssh -i /Users/mmr/Herd/mmrserver.pem ubuntu@3.226.65.68 "cd /var/www/recovery-backend && npx sequelize-cli db:migrate"

# 4. Restart
ssh -i /Users/mmr/Herd/mmrserver.pem ubuntu@3.226.65.68 "pm2 restart recovery-api && pm2 logs recovery-api --lines 20 --nostream"
```

Always `mysqldump` before running new migrations against production — no automated backup exists.

---

## 3. Environment variables (`.env` on the server)

**Set and working:** app/DB/JWT/bcrypt/rate-limit/mail config, `STRIPE_SECRET_KEY` (**live** key —
be careful testing payment flows against prod), `AGORA_APP_ID`.

**Deliberately empty (see §5, auth changes):** `JWT_ACCESS_EXPIRES_IN` — empty means access tokens
never expire, by explicit request.

**Still missing — real gaps, not yet configured:**

| Var | Effect while unset |
|---|---|
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Push notifications are **logged, not actually sent**. `firebase-admin` is installed and the code path is ready — just needs a Firebase service account. |
| `STRIPE_WEBHOOK_SECRET` | Ride payments can be *created* but never confirmed — need to add a webhook endpoint in the Stripe dashboard pointing at `https://api.recovernow.co.uk/api/v1/payments/stripe/webhook`, then paste the signing secret here. |
| `AGORA_APP_CERTIFICATE` | Voice call token generation will fail until this is set (console.agora.io → Project Management → this project → Edit → RTC → Primary Certificate). |
| `REDIS_URL` | Optional — app works fine single-instance without it (in-memory fallback for tower location/presence). Only needed if you ever run pm2 in cluster mode or add a second app server. |

A local `.env.example` documents every var but has no real values — copy it and fill in from the
server's real `.env` (via SSH) for local dev.

---

## 4. Everything built this session (chronological, high level)

1. **Synced local repo with the real deployed code** — this repo was badly out of date at session start (missing rides/chat/tower/company/OTP/profile entirely); pulled the real source down from the server first.
2. **FCM push notifications** — installed `firebase-admin`, wired real send (currently mocked, see §3).
3. **Chat → push when recipient is offline** — socket presence check, auto-push via existing notification pipeline.
4. **Stripe payment gating ride start** — `POST /mobile/rides/:id/pay` creates a PaymentIntent; webhook confirms; `start` endpoint 400s until paid.
5. **Ratings** — new `Rating` model/table, customer→tower, one per ride.
6. **Vendor commission + Stripe Connect payouts** — ride completion auto-credits `fare - commission%` to the tower's wallet (commission % already configurable via the existing generic Settings admin UI — no new work needed there). Stripe Connect Express onboarding endpoints added; admin's withdrawal "mark paid" now fires a real Stripe transfer.
7. **Agora voice calls** — token endpoint + `call:invite/accept/reject/end` socket signaling.
8. **Live location tracking, hardened**:
   - Redis-optional geo-index for tower presence/dispatch (falls back to in-memory, degrades gracefully — see `REDIS_URL` above).
   - **Timestamp staleness guard**: tower location updates now carry a client `ts`; server drops any update older than the last one applied. Fixes a real bug where the map position would flicker forward then snap back due to out-of-order network delivery.
   - **Auto-rejoin on reconnect**: every socket connection (first connect or reconnect) auto-restores ride-room membership and emits `ride:resync` — fixes a real bug where a network blip mid-ride would silently stop location/chat delivery with no visible error.
   - Fixed a real broken-code bug found along the way: `GET /mobile/tower/nearby` was throwing because a previous refactor made `getOnlineTowers()` async without adding the `await`.
9. **Domain migration to recovernow.co.uk** — verified nginx/SSL/DNS/`.env` all correctly cover both domains; found and removed a stray `wattan` app (unrelated Laravel project) that was sharing the server.
10. **Auth simplified, twice, per explicit request**:
    - Access token 15min → 7 days → **no expiry at all** (no `exp` claim).
    - **Refresh token removed entirely** — `/auth/refresh` deleted, `refreshToken` field gone from login/OTP-verify responses. Single token only.
    - Trade-off, worth knowing: a leaked access token is valid forever now — no revocation path short of rotating `JWT_ACCESS_SECRET`, which logs out every user.
11. **Rate-limit bug fix** — `express-rate-limit`'s default 429 response was a bare string with no `success` field (broke the Flutter app's response parsing). Fixed to match the app's JSON envelope, and raised the limit 200→1000/15min (200 was easy to exhaust from one device's location-update fallback alone).
12. **Explicitly declined**: a request to remove Bearer auth entirely and trust a client-supplied `user_id` instead, defaulting to user 1 if absent. Real broken-access-control risk on a live system with a live Stripe key — see the conversation if this comes up again, the reasoning is there.

## 5. Docs already in the repo (`docs/`)

| File | What it's for |
|---|---|
| `MOBILE_API.md` | Original API + Socket.IO event reference (the base doc) |
| `MOBILE_APIS_REFERENCE.md` | **Most complete/current** mobile API reference — every endpoint, request/response examples, kept in sync with actual code |
| `Mobile_API_Reference.docx` | Same content as above, as a Word doc (generated from the `.md` — regenerate via the script described in-session if the `.md` changes again; venv/script were rebuilt from scratch under `/private/tmp/...scratchpad` each session since that path doesn't persist) |
| `FLUTTER_INTEGRATION_GUIDE.md` | Step-by-step for the Flutter dev, one section per feature, gotchas called out |
| `INFRASTRUCTURE_REQUIREMENTS.md` | Client-facing doc on what's needed to run this at 10k-user scale (server specs, third-party services, cost ballpark) — **also flags that the current server is undersized and disk keeps creeping toward full (67% used, 2.2GB free as of this session)**, worth a look before it becomes urgent |
| `recovery_full_collection.json` | **The complete Postman collection** — 21 folders, ~99 requests, numbered, covers admin + mobile end to end |
| `mobile_postman_collection.json`, `recovery_v2_features_postman_collection.json` | Older/narrower collections, superseded by `recovery_full_collection.json` but left in place |
| `final_apistr.docx` | A snapshot the Flutter dev was given at some point — now slightly stale (predates the auth changes in §4.10), kept for reference only |

## 6. Outstanding / next steps

- [ ] Locate or rebuild `recovery-frontend` (see §0.3 — genuinely unresolved right now)
- [ ] Set `FIREBASE_*` vars so push notifications actually send
- [ ] Register the Stripe webhook in the dashboard, set `STRIPE_WEBHOOK_SECRET`
- [ ] Get `AGORA_APP_CERTIFICATE` from the Agora console
- [ ] Server disk/specs — see `INFRASTRUCTURE_REQUIREMENTS.md`, currently a single small box running app+DB+nginx together with disk usage climbing
- [ ] No automated DB backups exist — worth setting up before real user volume grows
- [ ] Confirm with the Flutter dev whether they've migrated tower location updates to the socket event (vs. the REST fallback) — relevant to the rate-limit fix in §4.11

## 7. Lessons learned this session (why some of the above matters)

- **This repo's local working directory got wiped once mid-session** (traced to a fresh `git clone`/reset happening outside this conversation — not something done from here) — lost everything uncommitted at the time. Recovered by re-pulling from the production server, since it was ahead of local git at that point. **Commit and push often** — don't let local-only work sit uncommitted.
- Deploys are entirely manual (§2, "How to deploy") — there's no staging environment and no CI. Double-check before pushing to `main` if that ever changes.
