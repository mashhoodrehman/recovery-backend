# Mobile App — Complete API Reference

Every endpoint the Flutter app (customer + tower) calls. Admin-only endpoints are excluded even
where nested under `/mobile` (e.g. document review, active-rides dashboard) — those belong to
the admin panel, not this app.

**Base URL:** `https://api.recovernow.co.uk/api/v1` (all paths below are relative to this — do not prepend it again)
**Auth:** unless marked "None", send `Authorization: Bearer <accessToken>`
**Tokens:** there is only one token. `accessToken` from endpoint 2 (or `/auth/login` for admin) never expires and there is no refresh token/endpoint anymore — get it once, store it, keep using it.
**Envelope:** every response is `{ "success": bool, "message": string, "data": ..., "meta"?: {...} }`; errors are `{ "success": false, "message": "...", "details": ... }` with a 4xx/5xx status.

--------------------------------------------------------------------------------

### 1. Send OTP
**URL:** `/mobile/send`
**Method:** `POST`
**Auth:** None

**Body:**
```json
{ "phone": "+923001234567" }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "message": "OTP sent",
    "otp": "1122",
    "expiresAt": "2026-07-24T10:10:00.000Z"
  }
}
```
> `otp` is only present outside production (`NODE_ENV !== 'production'`) — dev PIN is always `1122`. In production this field is omitted and a real SMS is sent instead.

--------------------------------------------------------------------------------

### 2. Verify OTP
**URL:** `/mobile/verify`
**Method:** `POST`
**Auth:** None

**Body:**
```json
{ "phone": "+923001234567", "otp": "1122" }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "isNewUser": true,
    "user": {
      "id": 5,
      "phone": "+923001234567",
      "username": null,
      "userType": null,
      "city": null,
      "country": "UK",
      "avatar": null,
      "isProfileComplete": false,
      "isOnline": false
    },
    "mode": null
  }
}
```
> `isNewUser: true` → route to profile setup (endpoint 3). `mode` is `null` until profile setup is done, then becomes `"customer"` or `"tower"` — convenience field for routing straight to the right home screen on later logins.

--------------------------------------------------------------------------------

### 3. Setup Profile (new users only)
**URL:** `/mobile/profile/setup`
**Method:** `POST`
**Auth:** Bearer required

**Body:**
```json
{ "username": "AliCustomer", "userType": "customer", "city": "Lahore", "country": "UK" }
```
> `userType`: `"customer"` | `"tower"`. `country`: `"UK"` | `"PK"` (defaults `"UK"`).

**Response `200`:**
```json
{
  "success": true,
  "message": "Profile setup complete",
  "data": {
    "id": 5,
    "phone": "+923001234567",
    "username": "AliCustomer",
    "userType": "customer",
    "city": "Lahore",
    "country": "UK",
    "isProfileComplete": true,
    "docsRequired": null,
    "nextStep": null
  }
}
```
> If `userType: "tower"`, `docsRequired` is an array of required document keys (varies by country) and `nextStep` points to endpoint 8.

--------------------------------------------------------------------------------

### 4. Get My Profile
**URL:** `/mobile/profile`
**Method:** `GET`
**Auth:** Bearer required

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 5,
    "phone": "+923001234567",
    "username": "AliCustomer",
    "userType": "customer",
    "city": "Lahore",
    "country": "UK",
    "avatar": null,
    "isProfileComplete": true,
    "isPhoneVerified": true,
    "isOnline": false,
    "currentLat": null,
    "currentLng": null,
    "mode": "customer"
  }
}
```

--------------------------------------------------------------------------------

### 5. Update Profile (avatar / city / country / FCM token)
**URL:** `/mobile/profile`
**Method:** `PATCH`
**Auth:** Bearer required
**Content-Type:** `multipart/form-data` (only send the fields you're changing)

**Body (form-data):**
| field | type | example |
|---|---|---|
| `city` | text | `Lahore` |
| `country` | text | `UK` |
| `fcmToken` | text | `dEf456...` (Firebase device token) |
| `avatar` | file | photo.jpg |

**Response `200`:**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "id": 5,
    "phone": "+923001234567",
    "username": "AliCustomer",
    "userType": "customer",
    "city": "Lahore",
    "country": "UK",
    "avatar": "https://recovery-api.laggarsay.com/uploads/profiles/1721.jpg",
    "isProfileComplete": true,
    "isOnline": false,
    "isPhoneVerified": true
  }
}
```
> Call this with just `fcmToken` on every login/app-start/token-refresh to keep push notifications working. `/notifications/register-token` (endpoint 34) does the same thing if you'd rather not send multipart just for a token update.

--------------------------------------------------------------------------------

### 6. Switch Role (customer ⇄ tower)
**URL:** `/mobile/profile/switch-role`
**Method:** `POST`
**Auth:** Bearer required

**Body:**
```json
{ "userType": "tower" }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Role switched",
  "data": {
    "userType": "tower",
    "docsRequired": [
      { "docType": "driving_license", "label": "Full UK Driving Licence (Category C or C+E for vehicles over 3.5t)", "status": "missing" },
      { "docType": "vehicle_insurance", "label": "Commercial Vehicle Insurance with Recovery/Towing Cover", "status": "missing" }
    ],
    "message": "Switched to tower mode. Please upload your verification documents."
  }
}
```
> `409 Conflict` if you're currently an online tower — must go offline first.

--------------------------------------------------------------------------------

### 7. Get Required Documents Checklist (tower)
**URL:** `/mobile/profile/tower/documents`
**Method:** `GET`
**Auth:** Bearer required

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "country": "UK",
    "allApproved": false,
    "summary": { "totalRequired": 8, "approved": 0, "pending": 1, "missing": 7 },
    "checklist": [
      {
        "docType": "driving_license",
        "label": "Full UK Driving Licence (Category C or C+E for vehicles over 3.5t)",
        "status": "pending",
        "docUrl": "https://recovery-api.laggarsay.com/uploads/documents/1721.jpg",
        "rejectionReason": null,
        "uploadedAt": "2026-07-20T09:00:00.000Z"
      }
    ]
  }
}
```

--------------------------------------------------------------------------------

### 8. Upload Document (tower)
**URL:** `/mobile/profile/tower/documents`
**Method:** `POST`
**Auth:** Bearer required
**Content-Type:** `multipart/form-data`

**Body (form-data):**
| field | type | example |
|---|---|---|
| `docType` | text | `driving_license` |
| `document` | file | license.jpg / .pdf |

**Response `200`:**
```json
{
  "success": true,
  "message": "Document uploaded — pending admin review",
  "data": {
    "docType": "driving_license",
    "label": "Full UK Driving Licence (Category C or C+E for vehicles over 3.5t)",
    "docUrl": "https://recovery-api.laggarsay.com/uploads/documents/1721.jpg",
    "status": "pending"
  }
}
```

--------------------------------------------------------------------------------

### 9. Start Stripe Connect Onboarding (tower — vendor payouts)
**URL:** `/mobile/profile/stripe/onboard`
**Method:** `POST`
**Auth:** Bearer required

**Query params (optional but recommended):**
| param | example |
|---|---|
| `returnUrl` | `myapp://stripe-return` |
| `refreshUrl` | `myapp://stripe-refresh` |

**Response `200`:**
```json
{
  "success": true,
  "message": "Open this URL to complete Stripe onboarding",
  "data": {
    "url": "https://connect.stripe.com/setup/e/acct_1P.../abcXYZ",
    "accountId": "acct_1P..."
  }
}
```
> Open `url` in an in-app webview. Without `returnUrl`/`refreshUrl` it falls back to a plain "you can close this window" page.

--------------------------------------------------------------------------------

### 10. Get Stripe Connect Status (tower)
**URL:** `/mobile/profile/stripe/status`
**Method:** `GET`
**Auth:** Bearer required

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "stripeAccountId": "acct_1P...",
    "onboardingComplete": true,
    "payoutsEnabled": true
  }
}
```
> `payoutsEnabled` must be `true` before requesting a Stripe withdrawal (endpoint under Admin — Wallets, `POST /withdrawals` with `method: "stripe"`).

--------------------------------------------------------------------------------

### 11. Tower — Go Online
**URL:** `/mobile/tower/online`
**Method:** `POST`
**Auth:** Bearer required (tower)

**Body:**
```json
{ "lat": 31.5204, "lng": 74.3587, "ts": 1774598400000 }
```
> `ts` = device clock time in ms (`Date.now()`), optional but recommended — see endpoint 13.

**Response `200`:**
```json
{ "success": true, "message": "Tower is online", "data": { "isOnline": true, "lat": 31.5204, "lng": 74.3587 } }
```
> Prefer the socket event `tower:online` for this in practice — this REST endpoint is a fallback.

--------------------------------------------------------------------------------

### 12. Tower — Go Offline
**URL:** `/mobile/tower/offline`
**Method:** `POST`
**Auth:** Bearer required (tower)

**Response `200`:**
```json
{ "success": true, "message": "Tower is offline", "data": { "isOnline": false } }
```

--------------------------------------------------------------------------------

### 13. Tower — Update Location (REST fallback)
**URL:** `/mobile/tower/location`
**Method:** `PATCH`
**Auth:** Bearer required (tower)

**Body:**
```json
{ "lat": 31.5210, "lng": 74.3592, "ts": 1774598405000 }
```
> `ts` = device clock time in ms, taken at the moment this GPS fix was read. Always send it (on this endpoint and on the `tower:location_update` socket event). The server uses it to silently drop an update that's actually older than one it already applied — without it, a slow request landing after a faster later one makes the tracked position flicker forward then snap back to a stale point. Omitting it just disables that protection for that one update; it's not required for the request to succeed.

**Response `200`:**
```json
{ "success": true, "message": "Success", "data": { "lat": 31.521, "lng": 74.3592 } }
```
> Prefer socket event `tower:location_update` every 3–5s instead — lower overhead, and it's what actually powers live customer tracking.

**Reconnect behavior (applies to both customer and tower sockets):** on every socket connection — first connect or an automatic reconnect after a network blip — the server checks for an active ride and, if found, silently rejoins that ride's room and immediately emits `ride:resync` with `{ rideId, status, towerId, fareAmount, paymentStatus }`. Handle that event to refresh the screen right away instead of waiting for the next natural update. There's no REST endpoint to trigger this — it's automatic on connect, so just let the socket client's built-in reconnection run and listen for `ride:resync`.

--------------------------------------------------------------------------------

### 14. Get Nearby Towers
**URL:** `/mobile/tower/nearby?lat=31.5204&lng=74.3587&radius=10`
**Method:** `GET`
**Auth:** Bearer required

**Params:** `lat` (required), `lng` (required), `radius` in km (optional, default 10)

**Response `200`:**
```json
{
  "success": true,
  "message": "Nearby towers",
  "data": [
    { "towerId": 12, "lat": 31.5199, "lng": 74.3601 }
  ]
}
```

--------------------------------------------------------------------------------

### 15. Create Ride Request (customer)
**URL:** `/mobile/rides`
**Method:** `POST`
**Auth:** Bearer required (customer)

**Body:**
```json
{
  "fromAddress": "Gulberg III, Lahore",
  "fromLat": 31.5204,
  "fromLng": 74.3587,
  "toAddress": "DHA Phase 5, Lahore",
  "toLat": 31.4890,
  "toLng": 74.3748,
  "customerNote": "Car broke down, engine won't start"
}
```

**Response `201`:**
```json
{ "success": true, "message": "Ride request created — searching for towers", "data": { "id": 1, "status": "searching" } }
```
> `409 Conflict` if the customer already has an active ride. Triggers radius-expansion dispatch (5→10→15 km) automatically — see `docs/MOBILE_API.md` for the socket events that follow.

--------------------------------------------------------------------------------

### 16. Get Ride Details
**URL:** `/mobile/rides/:id`
**Method:** `GET`
**Auth:** Bearer required (must be the ride's customer or tower)

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 1,
    "customerId": 5,
    "towerId": 12,
    "fromAddress": "Gulberg III, Lahore",
    "fromLat": "31.5204000",
    "fromLng": "74.3587000",
    "toAddress": "DHA Phase 5, Lahore",
    "toLat": "31.4890000",
    "toLng": "74.3748000",
    "status": "accepted",
    "fareAmount": "1500.00",
    "paymentStatus": "unpaid",
    "customer": { "id": 5, "username": "AliCustomer", "phone": "+923001234567" },
    "tower": { "id": 12, "username": "KarimTower", "phone": "+923009999999", "currentLat": "31.5199000", "currentLng": "74.3601000" },
    "bids": [
      { "id": 3, "amount": "1500.00", "etaMinutes": 10, "status": "accepted", "tower": { "id": 12, "username": "KarimTower", "phone": "+923009999999" } }
    ]
  }
}
```

--------------------------------------------------------------------------------

### 17. List My Rides
**URL:** `/mobile/rides?page=1&limit=20&status=completed`
**Method:** `GET`
**Auth:** Bearer required

**Params:** `page`, `limit` (optional), `status` (optional filter)

**Response `200`:**
```json
{
  "success": true,
  "message": "Rides",
  "data": [ { "id": 1, "status": "completed", "fareAmount": "1500.00" } ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

--------------------------------------------------------------------------------

### 18. Cancel Ride
**URL:** `/mobile/rides/:id/cancel`
**Method:** `POST`
**Auth:** Bearer required (customer or tower on the ride)

**Body (optional):**
```json
{ "reason": "Changed my mind" }
```

**Response `200`:**
```json
{ "success": true, "message": "Ride cancelled", "data": { "status": "cancelled" } }
```
> Only allowed while status is one of: `searching`, `bidding`, `accepted`, `tower_en_route`.

--------------------------------------------------------------------------------

### 19. Place Bid on Ride (tower)
**URL:** `/mobile/rides/:id/bids`
**Method:** `POST`
**Auth:** Bearer required (tower)

**Body:**
```json
{ "amount": 1500, "etaMinutes": 10, "note": "3 km away, flatbed truck" }
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Bid placed",
  "data": {
    "id": 3, "rideId": 1, "towerId": 12, "amount": "1500.00", "etaMinutes": 10, "note": "3 km away, flatbed truck", "status": "pending",
    "tower": { "id": 12, "username": "KarimTower", "phone": "+923009999999" }
  }
}
```
> One bid per tower per ride (`409` on a second attempt).

--------------------------------------------------------------------------------

### 20. Accept Bid (customer)
**URL:** `/mobile/rides/:id/bids/:bidId/accept`
**Method:** `POST`
**Auth:** Bearer required (customer)

**Response `200`:**
```json
{ "success": true, "message": "Bid accepted", "data": { "status": "accepted", "towerId": 12, "fareAmount": 1500 } }
```
> All other bids on the ride are auto-rejected. Next step is payment (endpoint 26).

--------------------------------------------------------------------------------

### 21. Reject Bid (customer)
**URL:** `/mobile/rides/:id/bids/:bidId/reject`
**Method:** `POST`
**Auth:** Bearer required (customer)

**Response `200`:**
```json
{ "success": true, "message": "Success", "data": { "status": "rejected" } }
```
> If no bids remain, the ride returns to `searching` and dispatch restarts automatically.

--------------------------------------------------------------------------------

### 22. Mark Arrived at Pickup (tower)
**URL:** `/mobile/rides/:id/arrived`
**Method:** `POST`
**Auth:** Bearer required (tower assigned to the ride)

**Response `200`:**
```json
{ "success": true, "message": "Marked as arrived at pickup", "data": { "status": "at_pickup" } }
```

--------------------------------------------------------------------------------

### 23. Start Ride (tower)
**URL:** `/mobile/rides/:id/start`
**Method:** `POST`
**Auth:** Bearer required (tower assigned to the ride)

**Response `200` (payment already confirmed):**
```json
{ "success": true, "message": "Ride started", "data": { "status": "in_progress", "startedAt": "2026-07-24T10:15:00.000Z" } }
```

**Response `400` (payment not done yet):**
```json
{ "success": false, "message": "Customer has not completed payment for this ride yet", "details": null }
```
> Don't show "Start Ride" as enabled until you've received the `ride:payment_confirmed` socket event or endpoint 27 shows `paymentStatus: "paid"`.

--------------------------------------------------------------------------------

### 24. Complete Ride (tower)
**URL:** `/mobile/rides/:id/complete`
**Method:** `POST`
**Auth:** Bearer required (tower assigned to the ride)

**Response `200`:**
```json
{ "success": true, "message": "Ride completed", "data": { "status": "completed", "fareAmount": 1500 } }
```
> This is also where `fareAmount - commission%` is credited to the tower's wallet automatically — no separate call needed.

--------------------------------------------------------------------------------

### 25. Get GPS Trail
**URL:** `/mobile/rides/:id/tracking`
**Method:** `GET`
**Auth:** Bearer required (customer or tower on the ride)

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    { "lat": "31.5204000", "lng": "74.3587000", "recordedAt": "2026-07-24T10:16:00.000Z" },
    { "lat": "31.5199000", "lng": "74.3601000", "recordedAt": "2026-07-24T10:16:30.000Z" }
  ]
}
```
> Points are saved every ~30s during an active ride. Prefer the socket event `ride:tower_location` for real-time display; this is the historical trail.

--------------------------------------------------------------------------------

### 26. Create / Reuse Ride PaymentIntent (customer)
**URL:** `/mobile/rides/:id/pay`
**Method:** `POST`
**Auth:** Bearer required (customer)

**Response `200`:**
```json
{
  "success": true,
  "message": "Payment intent created",
  "data": {
    "clientSecret": "pi_3P.._secret_AbCdEf",
    "paymentIntentId": "pi_3P..",
    "currency": "USD"
  }
}
```
> Feed `clientSecret` into the Flutter Stripe SDK's PaymentSheet. Calling this again before payment completes safely reuses the same intent instead of creating a duplicate charge.

--------------------------------------------------------------------------------

### 27. Poll Ride Payment Status
**URL:** `/mobile/rides/:id/payment`
**Method:** `GET`
**Auth:** Bearer required (customer or tower on the ride)

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 1, "customerId": 5, "towerId": 12,
    "paymentStatus": "paid",
    "stripePaymentIntentId": "pi_3P..",
    "fareAmount": "1500.00",
    "paidAt": "2026-07-24T10:14:50.000Z"
  }
}
```
> `paymentStatus`: `unpaid` → `pending` → `paid` (or `failed`). Fallback for whenever the `ride:payment_confirmed`/`ride:payment_failed` socket events are missed.

--------------------------------------------------------------------------------

### 28. Rate a Completed Ride (customer)
**URL:** `/mobile/rides/:id/rating`
**Method:** `POST`
**Auth:** Bearer required (customer)

**Body:**
```json
{ "stars": 5, "comment": "Fast and professional, highly recommend." }
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Rating submitted",
  "data": { "id": 1, "rideId": 1, "customerId": 5, "towerId": 12, "stars": 5, "comment": "Fast and professional, highly recommend." }
}
```
> Ride must be `completed`; one rating per ride (`409` on a second attempt).

--------------------------------------------------------------------------------

### 29. Get Ride Rating
**URL:** `/mobile/rides/:id/rating`
**Method:** `GET`
**Auth:** Bearer required (customer or tower on the ride)

**Response `200` (rated):**
```json
{ "success": true, "message": "Success", "data": { "id": 1, "rideId": 1, "stars": 5, "comment": "Fast and professional, highly recommend." } }
```
**Response `200` (not yet rated):**
```json
{ "success": true, "message": "Success", "data": null }
```

--------------------------------------------------------------------------------

### 30. Get Voice Call Token (Agora)
**URL:** `/mobile/rides/:id/call/token`
**Method:** `GET`
**Auth:** Bearer required (customer or tower on the ride, once a tower is assigned)

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "appId": "81db6949df6242ab8fe95023e912c8f6",
    "channel": "ride_1",
    "token": "006MTA4NDcxNTQ...",
    "uid": 5,
    "expiresAt": 1774598400
  }
}
```
> Token expires 1 hour after issue (`expiresAt`, unix seconds). Ringing itself is socket events `call:invite` → `call:incoming` → `call:accept`/`call:reject` — not a REST call. See `docs/FLUTTER_INTEGRATION_GUIDE.md` §6.

--------------------------------------------------------------------------------

### 31. Get Ride Messages
**URL:** `/mobile/rides/:rideId/messages?page=1&limit=50`
**Method:** `GET`
**Auth:** Bearer required (customer or tower on the ride)

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "messages": [
      { "id": 9, "rideId": 1, "senderId": 12, "sender": { "id": 12, "username": "KarimTower", "avatar": null, "userType": "tower" }, "messageType": "text", "message": "On my way!", "imageUrl": null, "isRead": true, "createdAt": "2026-07-24T10:12:00.000Z" }
    ],
    "meta": { "total": 1, "page": 1, "limit": 50, "pages": 1 }
  }
}
```
> Chat is only available once the ride is past `bidding` (i.e. a tower is accepted). Also marks the other party's unread messages as read as a side effect. Live send is via socket events `chat:send`/`chat:message` — see `docs/MOBILE_API.md`.

--------------------------------------------------------------------------------

### 32. Send Chat Image
**URL:** `/mobile/rides/:rideId/messages/image`
**Method:** `POST`
**Auth:** Bearer required (customer or tower on the ride)
**Content-Type:** `multipart/form-data`

**Body (form-data):**
| field | type | example |
|---|---|---|
| `image` | file | photo.jpg |

**Response `200`:**
```json
{ "success": true, "message": "Image sent", "data": { "imageUrl": "https://recovery-api.laggarsay.com/uploads/chat/1721.jpg", "messageId": 9 } }
```
> If the other party has no live socket connection right now, they automatically get a push notification ("Sent a photo").

--------------------------------------------------------------------------------

### 33. Register FCM Push Token (alternative to endpoint 5)
**URL:** `/notifications/register-token`
**Method:** `POST`
**Auth:** Bearer required

**Body:**
```json
{ "fcmToken": "dEf456..." }
```

**Response `200`:**
```json
{ "success": true, "message": "Device token registered", "data": null }
```
> Same effect as PATCHing `fcmToken` on endpoint 5 — use whichever is more convenient; no need to call both.

--------------------------------------------------------------------------------

## Error format (applies to every endpoint above)

```json
{ "success": false, "message": "Human-readable error", "details": null }
```

Common status codes: `400` validation/bad request · `401` missing/expired token · `403` action not allowed for your role · `404` not found · `409` conflict (e.g. duplicate bid, already rated, already have an active ride).
