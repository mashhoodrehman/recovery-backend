# Infrastructure & Third-Party Service Requirements — Scaling to 10,000 Users

Prepared for planning the production environment needed to run the Recovery platform
(customer/tower marketplace app + admin panel) at a 10,000-user scale, including the new
payments, payouts, and voice-call features.

## 0. Urgent — current server is undersized right now, independent of any scaling plan

The current production box (`3.226.65.68`) is a **2 vCPU / 1.9 GB RAM** instance with only
**6.7 GB total disk, of which 2.7 GB is free**, running the Node API, MySQL, and nginx all on
the *same* machine, as a single `pm2` process with no Redis, no read replica, and no automated
backup visible. This is fine for development/demo, but:

- **Disk is close to full already.** Uploaded chat images/documents and MySQL data will hit the
  limit within normal usage growth, at which point writes start failing outright. This needs
  addressing before any feature work goes live, regardless of the 10k-user roadmap below.
- **Single point of failure.** App, database, and web server all go down together on any crash,
  reboot, or resource exhaustion.
- This is a "fix this week" item, separate from the growth plan below.

---

## 1. Sizing assumptions

"10,000 users" is being sized as: 10,000 **registered** accounts (customers + towers combined),
with a realistic concurrency envelope of roughly **800–1,500 simultaneously connected app
sessions** at peak (Socket.IO connections for chat/location/notifications) and **50–150 active
rides in progress** at any given moment. Adjust the tier below up or down if actual usage looks
different once live (e.g. a single-city rollout will peak lower than a national one).

## 2. Recommended architecture

```
                        ┌────────────────────┐
                        │   Cloudflare/DNS    │
                        └─────────┬───────────┘
                                  │
                     ┌────────────┴────────────┐
                     │   Load balancer (nginx/  │
                     │   ALB) — TLS termination │
                     └──────┬──────────┬────────┘
                            │          │
                  ┌─────────▼──┐  ┌────▼────────┐
                  │ App server │  │ App server  │   ← pm2 cluster mode, 2+ instances
                  │ (Node API  │  │ (Node API   │      behind the load balancer once
                  │ + Socket.IO│  │ + Socket.IO │      traffic requires it
                  └──────┬─────┘  └──────┬──────┘
                         │               │
              ┌──────────┴───────────────┴──────────┐
              │                                       │
      ┌───────▼────────┐                    ┌─────────▼────────┐
      │  MySQL (managed  │                    │  Redis (managed   │
      │  or dedicated VM,│                    │  e.g. ElastiCache/│
      │  primary+replica)│                    │  Upstash)         │
      └──────────────────┘                    └───────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Object storage (S3) │  ← chat images, tower documents,
              │ for uploads         │     profile photos — NOT local disk
              └──────────────────────┘
```

The app already supports the Redis-adapter/cluster-mode path (added alongside this feature set) —
`REDIS_URL` set + `pm2 start ecosystem.config.js -i max` is what turns on multi-core/multi-instance
scaling; without Redis configured, everything still works but only on a single process.

## 3. Server specs by growth stage

| Stage | App server(s) | Database | Redis | Notes |
|---|---|---|---|---|
| **Now → soft-launch** (few hundred concurrent) | 1× 2 vCPU / 4 GB RAM / 40 GB SSD | Same box or a small managed MySQL (1 vCPU/2GB) | 1× small managed Redis (256MB–1GB) | Minimum to stop being disk/RAM-starved. Single instance is acceptable at this stage. |
| **Growth** (up to ~5,000 users, low hundreds concurrent) | 1–2× 4 vCPU / 8 GB RAM / 80 GB SSD, pm2 cluster mode | Managed MySQL 2 vCPU / 8 GB RAM, primary + 1 read replica, automated daily backups | Managed Redis 1–2 GB | Move uploads to S3 at this stage at the latest. |
| **10,000 users** (800–1,500 concurrent, 50–150 active rides) | 2–3× 4 vCPU / 8 GB RAM behind a load balancer, pm2 cluster mode (`-i max`) on each | Managed MySQL 4 vCPU / 16 GB RAM, primary + read replica, point-in-time recovery backups | Managed Redis 2–4 GB, standard HA/replica tier | This is the tier this doc is sized for. |

Any reputable cloud provider works (AWS, DigitalOcean, Hetzner, GCP) — the important thing is
**managed database + managed Redis** rather than self-hosting them on the app box, so patching,
backups, and failover aren't a manual chore.

## 4. Third-party services required

| Service | Purpose | Recommendation |
|---|---|---|
| **SMS/OTP delivery** | Phone login (`docs/MOBILE_API.md` OTP flow) currently returns the OTP in the API response for dev — production needs real SMS delivery | Twilio (already referenced in the codebase/docs as the intended provider) — budget ~$0.01–0.08/SMS depending on country |
| **Transactional email** | Password resets, admin notifications, receipts | A real ESP, not raw SMTP/Mailtrap as currently configured — SendGrid, Postmark, or AWS SES. SES is cheapest at volume; Postmark has the best deliverability reputation for transactional mail |
| **Push notifications (FCM)** | Now wired in this update | Firebase project (free) — just needs a service account set up and `firebase-admin` installed on the server (done in this update); no separate hosting cost |
| **Payments** | Ride fare collection | Stripe. Standard processing fees (~1.5–2.9% + fixed fee depending on region/card type) apply on every charge — factor this into fare/commission math, it comes out of the platform's cut, not a separate line item |
| **Vendor payouts** | Commission-split payout to towers | Stripe Connect (Express accounts) — Stripe charges a small per-payout/transfer fee; towers go through Stripe's hosted KYC/identity verification, which is Stripe's regulatory burden, not the platform's |
| **Voice calls** | In-ride customer↔tower calling | Agora — pay-per-minute pricing (free tier covers low volume; budget a few hundred dollars/month once ride volume is meaningful) |
| **Object storage** | Chat images, tower verification documents, profile photos | S3 (or S3-compatible: DigitalOcean Spaces, Backblaze B2) — cents/GB/month, and removes uploads from the app server's disk entirely |
| **DNS/SSL** | Already in place | Existing Let's Encrypt via Certbot is fine to keep |
| **Monitoring/error tracking** | Not currently in place | Recommend adding one APM/error tool — Sentry (errors) + a basic uptime monitor (UptimeRobot/Better Uptime) at minimum; a full APM (Datadog/New Relic) is a nice-to-have, not a blocker |

## 5. Data protection notes

The user model already has UK-specific fields (driving licence, MOT, operator's licence, etc.),
implying at least one target market is the UK — plan for **UK GDPR** compliance (data processing
agreement with the hosting/ESP/SMS providers, a documented data retention policy for uploaded
ID/licence documents, and a way to fully delete a user's data on request). This is a legal/process
requirement more than an infrastructure one, but it does influence provider choice (Stripe, AWS,
Twilio, SendGrid, Firebase all offer standard DPAs).

## 6. Backups & disaster recovery

- Database: automated daily backups with at least 7-day retention, plus point-in-time recovery
  if the managed provider offers it (most do at the tiers above).
- Object storage (S3): versioning enabled on the uploads bucket.
- Infrastructure-as-code (even a simple provisioning script) so the app servers can be rebuilt
  quickly — currently the server was set up manually, which makes disaster recovery slower than
  it needs to be.

## 7. Rough monthly cost ballpark (10,000-user tier)

| Item | Estimate (USD/month) |
|---|---|
| 2–3 app servers (4 vCPU/8GB each) | $80–180 |
| Managed MySQL (primary + replica, 4 vCPU/16GB) | $150–300 |
| Managed Redis (2–4GB, HA) | $40–100 |
| Object storage (S3, low hundreds of GB) | $5–20 |
| Twilio SMS (volume-dependent) | $50–500+ |
| Transactional email (volume-dependent) | $10–50 |
| Agora voice minutes (volume-dependent) | $20–300+ |
| Monitoring/error tracking | $0–50 |
| **Infrastructure subtotal (excl. Stripe/Twilio/Agora usage fees)** | **≈ $270–650/month** |

Stripe/Twilio/Agora are usage-based on top of the above and scale with actual ride volume, not
user count directly — hard to pin down without expected rides-per-day, but the platform's
commission (`commission_percent` setting) is the natural place to absorb Stripe's processing fee.

---

*This is a planning estimate, not a quote from any specific provider — get current pricing from
whichever cloud/SMS/email vendor is actually selected before committing to a budget.*
