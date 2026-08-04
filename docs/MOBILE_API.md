# Recovery Mobile API — Complete Reference

> For mobile developers (iOS / Android / React Native).  
> Base REST URL: `http://localhost:4000/api/v1`  
> WebSocket URL: `ws://localhost:4000` (Socket.IO v4)

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

### Phone OTP Flow

#### 1. Send OTP
```
POST /mobile/send
Body: { "phone": "+923001234567" }
```
Response:
```json
{
  "success": true,
  "data": {
    "message": "OTP sent",
    "otp": "1122",        // DEV ONLY — removed in production
    "expiresAt": "..."
  }
}
```
> In production: Twilio sends OTP to phone. Remove `otp` from response.  
> Dev PIN: **1122**

---

#### 2. Verify OTP
```
POST /mobile/verify
Body: { "phone": "+923001234567", "otp": "1122" }
```
Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "isNewUser": true,
    "user": {
      "id": 5,
      "phone": "+923001234567",
      "username": null,
      "userType": null,
      "city": null,
      "isProfileComplete": false
    }
  }
}
```
> If `isNewUser: true` → redirect to profile setup screen.

---

#### 3. Complete Profile (new users only)
```
POST /mobile/profile/setup  🔒
Body: {
  "username": "AliDriver",
  "userType": "customer",    // "customer" | "tower"
  "city": "Lahore"
}
```
Response: updated user object.

---

#### 4. Get My Profile
```
GET /mobile/profile  🔒
```

---

## Tower Endpoints (userType = "tower")

### Go Online
```
POST /mobile/tower/online  🔒
Body: { "lat": 31.5204, "lng": 74.3587 }
```
> Also emit `tower:online` via WebSocket for real-time tracking (see WebSocket section).

### Go Offline
```
POST /mobile/tower/offline  🔒
```

### Update Location (REST fallback)
```
PATCH /mobile/tower/location  🔒
Body: { "lat": 31.5204, "lng": 74.3587 }
```
> **Prefer WebSocket** `tower:location_update` event — faster and avoids HTTP overhead.

### Get Nearby Towers (customer use)
```
GET /mobile/tower/nearby?lat=31.5204&lng=74.3587&radius=10  🔒
```
Returns array of online towers within `radius` km.

---

## Ride Endpoints

### Create Ride Request (customer only)
```
POST /mobile/rides  🔒
Body: {
  "fromAddress": "Gulberg III, Lahore",
  "fromLat": 31.5204,
  "fromLng": 74.3587,
  "toAddress": "DHA Phase 5, Lahore",
  "toLat": 31.4890,
  "toLng": 74.3748,
  "customerNote": "Please be fast"
}
```
Response: `{ "id": 1, "status": "searching" }`

> Triggers radius expansion dispatch automatically (5 → 10 → 15 km).

---

### Get Ride Details
```
GET /mobile/rides/:id  🔒
```
Returns full ride with bids and tower info.

### List My Rides
```
GET /mobile/rides?page=1&limit=20&status=completed  🔒
```

### Cancel Ride
```
POST /mobile/rides/:id/cancel  🔒
Body: { "reason": "Changed my mind" }    // optional
```
> Allowed for customer or tower. Only cancellable in: `searching`, `bidding`, `accepted`, `tower_en_route`.

---

## Bidding

### Tower Places Bid
```
POST /mobile/rides/:id/bids  🔒  (tower only)
Body: {
  "amount": 1500,
  "etaMinutes": 10,
  "note": "I am 3 km away"
}
```
> One bid per tower per ride. Automatically moves ride to `bidding` status.

### Customer Accepts Bid
```
POST /mobile/rides/:id/bids/:bidId/accept  🔒  (customer only)
```
> All other bids are rejected. Tower receives `ride:bid_accepted` socket event.

### Customer Rejects Bid
```
POST /mobile/rides/:id/bids/:bidId/reject  🔒  (customer only)
```
> If no bids remain, ride returns to `searching` and dispatch restarts.

---

## Ride Lifecycle (tower only)

| Step | Endpoint | Trigger |
|---|---|---|
| Arrived at pickup | `POST /mobile/rides/:id/arrived` | Tower reaches customer's location |
| Start ride | `POST /mobile/rides/:id/start` | Customer is in vehicle |
| Complete ride | `POST /mobile/rides/:id/complete` | Job done |

### Get GPS Trail
```
GET /mobile/rides/:id/tracking  🔒
```
Returns array of `{ lat, lng, recordedAt }` saved every 30 seconds during ride.

---

## WebSocket (Socket.IO v4)

**Connect:**
```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: '<accessToken>' },
  transports: ['websocket', 'polling'],
});
```
On connect, the server automatically joins you to `user:<yourId>` room.

---

### Events emitted by CLIENT → SERVER

| Event | Payload | Who | Description |
|---|---|---|---|
| `tower:online` | `{ lat, lng, ts }` | Tower | Go online + set initial location |
| `tower:offline` | — | Tower | Go offline |
| `tower:location_update` | `{ lat, lng, ts }` | Tower | Send location every 3-5 seconds |
| `admin:join` | — | Admin | Join admin room for live dashboard |

> `ts` = the device's own clock time in ms (`Date.now()` at the moment the fix was taken), **not** anything server-related. The server uses it to silently drop an update that arrives late and is actually older than one it already applied — without it, a slow request landing after a faster later one can make the tracked position flicker forward then jump back. Always send it; omitting it disables this protection for that update.

---

### Events emitted by SERVER → CLIENT (Tower)

| Event | Payload | Description |
|---|---|---|
| `tower:online_ack` | `{ success: true }` | Confirmed online |
| `tower:offline_ack` | `{ success: true }` | Confirmed offline |
| `ride:new_request` | `{ rideId, fromLat, fromLng, fromAddress, toLat, toLng, toAddress, customerNote, distanceKm }` | New job in your area |
| `ride:bid_accepted` | `{ rideId, bidId, fromLat, fromLng, fromAddress }` | Customer accepted your bid → navigate to pickup |
| `ride:bid_rejected` | `{ rideId, bidId }` | Customer rejected your bid |
| `ride:cancelled` | `{ rideId, reason }` | Customer cancelled |

---

### Events emitted by SERVER → CLIENT (Customer)

| Event | Payload | Description |
|---|---|---|
| `ride:new_bid` | `{ rideId, bid: { id, towerId, amount, etaMinutes, note, tower } }` | A tower placed a bid |
| `ride:no_towers` | `{ rideId }` | No towers responded after 3 minutes |
| `ride:tower_location` | `{ rideId, towerId, lat, lng, ts }` | Real-time tower position during ride |
| `ride:tower_arrived` | `{ rideId }` | Tower arrived at your pickup point |
| `ride:started` | `{ rideId, startedAt }` | Ride officially started |
| `ride:completed` | `{ rideId, completedAt, fareAmount }` | Ride completed |
| `ride:cancelled` | `{ rideId, reason }` | Tower cancelled |

---

### Reconnect behavior (both Tower and Customer)

On **every** socket connection — first connect of a session, or an automatic reconnect after a
network blip — the server checks whether you currently have an active ride (`accepted` through
`in_progress`) and, if so, silently rejoins you to that ride's room and immediately sends:

| Event | Payload | Description |
|---|---|---|
| `ride:resync` | `{ rideId, status, towerId, fareAmount, paymentStatus }` | Sent right after connecting, only if you have an active ride. Use it to refresh the screen immediately instead of waiting for the next natural event. |

You don't need to call anything to trigger this — it's automatic on connect, including reconnects
Socket.IO's client performs on its own after a dropped connection. There is no separate
"reconnect" REST endpoint; just let the socket client's built-in reconnection do its thing and
handle `ride:resync` when it arrives.

---

### Events emitted by SERVER → Admin Dashboard

| Event | Payload | Description |
|---|---|---|
| `admin:online_towers` | `{ towers: [{towerId, lat, lng}], count }` | Full list of online towers |
| `admin:tower_location` | `{ towerId, lat, lng, ts }` | Single tower location update |
| `admin:ride_update` | `{ rideId, status, ts }` | Any ride status change |

---

## Dispatch Logic — Radius Expansion

When a customer creates a ride:

```
T+0s    → Notify all online towers within 5 km
T+60s   → If no bid accepted: expand to 10 km (notify 5-10 km ring)
T+120s  → If no bid accepted: expand to 15 km (notify 10-15 km ring)
T+180s  → If still no bid: status = no_towers_available
            Customer receives ride:no_towers socket event
```

When a tower places a bid:
- Radius expansion is **stopped immediately**
- Ride moves to `bidding` status
- Customer sees all bids and can accept/reject

---

## Ride Status Flow

```
searching
  └─ (tower bids)            → bidding
      └─ (customer accepts)  → accepted
          └─ (tower en route) → tower_en_route  [optional intermediate]
              └─ (tower arrived) → at_pickup
                  └─ (tower starts) → in_progress
                      └─ (tower completes) → completed

  Any state before in_progress → cancelled  (by customer or tower)
  No response after 3 min     → no_towers_available
```

---

## Tokens (mobile)

There is only **one** token — the access token returned by `/mobile/verify` (or `/auth/login` for
admin). It **never expires** — no `exp` claim at all, by explicit request — and there is no
refresh token or refresh endpoint anymore; `/auth/refresh` has been removed. Store the access
token once and keep using it for every request and every Socket.IO connection indefinitely.

**Security note:** because the token never expires and there's no blocklist, there is no automatic
recovery from a leaked token — it stays valid indefinitely. The only way to invalidate one early is
rotating `JWT_ACCESS_SECRET` on the server, which logs out every user, not just the affected one.

---

## Error Response Format

All errors follow:
```json
{
  "success": false,
  "message": "Human-readable error",
  "details": null
}
```

Common HTTP codes:
- `400` — Validation failed / bad request
- `401` — Missing or expired token
- `403` — Action not allowed for your role
- `404` — Resource not found
- `409` — Conflict (e.g. already have active ride)
