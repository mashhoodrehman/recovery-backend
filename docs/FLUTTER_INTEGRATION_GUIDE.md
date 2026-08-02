# Flutter Integration Guide — v2 Features

Companion to `docs/MOBILE_API.md` (base ride/chat/tower API) and `docs/recovery_v2_features_postman_collection.json`
(import that collection to try every request below). This doc only covers what's **new**: push
notifications, Stripe payment, ratings, vendor payouts, and Agora voice calls. Base URL and auth
are unchanged — `Authorization: Bearer <accessToken>` on every request, Socket.IO connect with
`auth: { token }`.

Go through this section by section, in order — each one lists the exact endpoint/event names,
request/response shapes, and the specific mistake that breaks it if skipped.

---

## 1. Push notifications (FCM)

**Package:** `firebase_messaging` (+ `firebase_core`, standard FlutterFire setup with your own
`google-services.json` / `GoogleService-Info.plist` — that part is 100% client-side Firebase
console config, nothing the backend can do for you).

Steps:
1. Initialize Firebase in the app as usual, request notification permission (iOS especially).
2. Get the device token: `FirebaseMessaging.instance.getToken()`.
3. **Immediately PATCH it to the backend** on every login and app start:
   ```
   PATCH /mobile/profile
   { "fcmToken": "<token>" }
   ```
4. Listen for `FirebaseMessaging.instance.onTokenRefresh` and PATCH again whenever it fires —
   tokens rotate periodically; a stale token means silent, permanent notification loss for that
   user until they happen to log in again.
5. That's it server-side — every `notify()`/`notifyMany()` call already in the backend (bid
   placed, bid accepted, withdrawal approved, chat while offline, payment confirmed, rating
   received, etc.) now delivers automatically.

**Gotcha:** if the server logs `[push:mock] -> N device(s): ...` instead of actually sending,
`firebase-admin` isn't installed or `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`
aren't set on the server — that's an ops-side fix (see the deployment doc), not a client bug.

---

## 2. Chat push when the other party is offline

No new endpoint or event — this is a behavior change to the existing chat flow. Keep using
`chat:send` / `chat:send_image` (socket) and `POST /mobile/rides/:id/messages/image` exactly as
documented in `MOBILE_API.md`. If the recipient's app isn't connected to the socket at that
moment (backgrounded/killed), they now get a push automatically with the message text (or "Sent
a photo" for images) and `data: { rideId }` so tapping it can deep-link straight into that ride's
chat screen.

**Gotcha:** "offline" here means *no live socket connection*, not "app closed for a while" —
reconnect your socket promptly on app resume so this only fires when it should.

---

## 3. Stripe payment — bid accepted → pay → ride starts

**Package:** `flutter_stripe`.

Flow, once a bid is accepted (ride status becomes `accepted`):
1. `POST /mobile/rides/:id/pay` (customer) → returns `{ clientSecret, paymentIntentId, currency }`.
2. In Flutter, confirm the payment with the Stripe SDK using that `clientSecret` — either
   `Stripe.instance.initPaymentSheet(...)` + `presentPaymentSheet()` (recommended, handles 3DS)
   or `Stripe.instance.confirmPayment(paymentIntentClientSecret: clientSecret, ...)` directly.
3. **Do not** treat the Stripe SDK's local "success" as ground truth — wait for confirmation
   from the backend, either:
   - the socket event `ride:payment_confirmed` (`{ rideId }`) broadcast to the ride room, or
   - poll `GET /mobile/rides/:id/payment` and check `paymentStatus === 'paid'`.
   This is because the backend only flips `paymentStatus` when Stripe's webhook fires, which is
   the authoritative signal (handles delayed/async payment methods too).
4. The tower can go en route / mark arrived as normal at any point — but `POST /mobile/rides/:id/start`
   will return `400 "Customer has not completed payment for this ride yet"` until step 3 has
   actually happened. Don't let the tower's UI show "Start Ride" as enabled until you've also seen
   `ride:payment_confirmed` — avoids a confusing tap-and-error.
5. Also listen for `ride:payment_failed` (`{ rideId }`) to prompt the customer to retry — calling
   `POST /mobile/rides/:id/pay` again safely reuses/renews the same intent.

**Gotcha:** the amount charged is `ride.fareAmount` (the accepted bid amount) in whatever currency
the admin's `currency` setting is — don't hardcode USD in the UI, read it off the response.

---

## 4. Ratings

After a ride reaches `completed`:
```
POST /mobile/rides/:id/rating
{ "stars": 5, "comment": "optional text" }
```
Customer only, once per ride (second attempt → `409 Conflict`). `GET /mobile/rides/:id/rating`
to redisplay it later (e.g. in ride history). There is currently no tower→customer rating —
if that's wanted later it's a symmetric addition, flag it separately.

---

## 5. Vendor (tower) payouts — Stripe Connect

This is the multi-step one; do it in this order or towers will hit confusing dead-ends.

1. **Vendor onboarding.** After a user switches to tower mode (`POST /mobile/profile/switch-role`),
   add a "Set up payouts" step (can be same screen as document upload, or a separate "Payouts"
   settings screen — there's no separate OTP-signup step for this since phone-only signup has no
   email/identity to attach a Stripe account to yet):
   ```
   POST /mobile/profile/stripe/onboard?returnUrl=<your-deep-link>&refreshUrl=<your-deep-link>
   ```
   Returns `{ url }` — open it in an in-app webview (`webview_flutter` or `flutter_web_auth_2`).
   Stripe's hosted onboarding form collects identity/bank details there; you don't build any of
   that UI yourself. Pass your own deep link as `returnUrl`/`refreshUrl` so you can catch Stripe
   closing the webview and pop back into the app (otherwise it lands on a plain "you can close
   this window" HTML page).
2. **Check status** any time with `GET /mobile/profile/stripe/status` →
   `{ stripeAccountId, onboardingComplete, payoutsEnabled }`. Don't let a tower request a Stripe
   withdrawal until `payoutsEnabled: true` — Stripe flips this asynchronously (can take a few
   minutes to hours depending on what they submitted), so show a "verification in progress" state
   rather than blocking the whole app.
3. **Earnings land automatically.** Every time a ride the tower completes moves to `completed`,
   `fareAmount - commission%` is credited to their wallet as an `available` balance — nothing the
   app needs to call for this, just read `GET /wallets/me` (existing endpoint) to show balance.
4. **Request payout:**
   ```
   POST /withdrawals
   { "amount": 100, "method": "stripe" }
   ```
   Blocked with `400` if `amount` is under the admin-configured minimum (surface that number in
   the UI — it's in the public settings, or just show the server's error message) or if the
   wallet's available balance is insufficient.
5. Admin approves and marks paid on their side (admin panel) — that's when the real Stripe
   transfer fires to the tower's connected account. There's no app-side action for this step;
   just poll/refresh `GET /withdrawals?scope=mine` to show status moving `pending → approved → paid`.

---

## 6. Voice call (Agora) during a ride

**Package:** `agora_rtc_engine`.

Calling is only allowed once a tower is assigned (`accepted` through `in_progress`). Two parts:
Agora carries the audio, your own socket events handle ringing/accept/reject/end (Agora has no
concept of "ringing" — that's on you).

1. Caller taps "Call": emit socket event `call:invite` with `{ rideId }`.
2. Callee's app receives `call:incoming` (`{ rideId, fromUserId, channel }`) — show an incoming-call
   screen. On accept, emit `call:accept` with `{ rideId, toUserId: fromUserId }`; on decline, emit
   `call:reject` with the same shape. The original caller listens for `call:accepted` /
   `call:rejected` to know what happened.
3. Once accepted, **both sides** fetch a token and join the Agora channel:
   ```
   GET /mobile/rides/:id/call/token
   → { appId, channel, token, uid, expiresAt }
   ```
   `channel` is always `ride_<rideId>` — same for both participants, that's how they land in the
   same call. `uid` is just their own numeric user id — pass it straight into `joinChannel`.
4. `RtcEngine.create(appId)` → `joinChannel(token, channel, null, uid)`. Token expires after 1
   hour (`expiresAt`, unix seconds) — refetch and rejoin if a call somehow runs that long.
5. On hangup (either side), emit `call:end` with `{ rideId, toUserId }` so the other app can leave
   the channel and dismiss its call UI — Agora itself won't tell the other party the call ended
   until their own connection drops, which feels laggy without this.

**Gotcha:** the REST token endpoint enforces ride-participant + ride-status checks, but the
`call:*` socket events do a lighter check (ride membership + callable status) — don't skip the
`call:invite` step and jump straight to Agora, or the other party never gets a ring.

---

## Quick reference — new/changed endpoints

| Method | Path | Notes |
|---|---|---|
| PATCH | `/mobile/profile` | now also accepts `fcmToken` |
| POST | `/mobile/rides/:id/pay` | create/reuse PaymentIntent |
| GET | `/mobile/rides/:id/payment` | poll payment status |
| POST | `/payments/stripe/webhook` | Stripe → backend only, not called by the app |
| POST | `/mobile/rides/:id/start` | now 400s if payment isn't `paid` |
| POST | `/mobile/rides/:id/rating` | customer rates completed ride |
| GET | `/mobile/rides/:id/rating` | |
| POST | `/mobile/profile/stripe/onboard` | tower Stripe Connect onboarding link |
| GET | `/mobile/profile/stripe/status` | |
| POST | `/withdrawals` | `method: "stripe"` now supported end-to-end |
| GET | `/mobile/rides/:id/call/token` | Agora RTC token |

| Socket event | Direction | Payload |
|---|---|---|
| `ride:payment_confirmed` | server→client | `{ rideId }` |
| `ride:payment_failed` | server→client | `{ rideId }` |
| `call:invite` | client→server | `{ rideId }` |
| `call:incoming` | server→client | `{ rideId, fromUserId, channel }` |
| `call:accept` / `call:reject` | client→server | `{ rideId, toUserId }` |
| `call:accepted` / `call:rejected` | server→client | `{ rideId, fromUserId }` |
| `call:end` | client→server | `{ rideId, toUserId }` |
| `call:ended` | server→client | `{ rideId, fromUserId }` |
