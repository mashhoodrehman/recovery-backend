const logger = require('../utils/logger');
const redis = require('./redis.service');

const GEO_KEY = 'geo:towers:online';
const ACTIVE_RIDE_KEY = (towerId) => `tower:activeRide:${towerId}`;
const LAST_TS_KEY = (towerId) => `tower:lastTs:${towerId}`;

// Haversine distance in km — used for the in-memory fallback path only. When Redis is
// configured, GEOSEARCH does this same job server-side and scales far better than scanning
// every online tower in JS on every dispatch tick.
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Tower presence / live-location dispatch.
 *
 * Two storage tiers:
 *  - `towerLocations` (in-process Map): always maintained, used for same-process fast paths
 *    (disconnect-ownership checks, and as the only store when Redis isn't configured).
 *  - Redis (geo set + per-tower active-ride keys): the shared source of truth once REDIS_URL
 *    is set, so state survives process restarts and is correct across pm2 cluster workers /
 *    multiple app servers behind a load balancer. Without Redis this only works correctly on
 *    a single Node process — fine for small deployments, not for horizontal scaling.
 *
 * The radius-expansion dispatch timers (startDispatch) intentionally stay in-process/in-memory
 * even with Redis configured — coordinating "exactly one worker owns this ride's timers" across
 * a cluster needs a real job queue (e.g. BullMQ), which is out of scope here. Run ride dispatch
 * on a single instance (or route ride-creation traffic to one instance) until that's built.
 */
class DispatchService {
  constructor() {
    this.towerLocations = new Map(); // towerId(string) -> { lat, lng, socketId, lastSaved }
    this.activeSearches = new Map(); // rideId -> { timers: [], notifiedTowers: Set<towerId> }
    this.towerActiveRide = new Map(); // towerId(string) -> rideId (in-process cache/fallback)
    this.io = null;
  }

  setIo(io) {
    this.io = io;
  }

  // ─── Tower presence ────────────────────────────────────────────────────────

  async towerOnline(towerId, socketId, lat, lng, ts) {
    const key = String(towerId);
    this.towerLocations.set(key, { lat: Number(lat), lng: Number(lng), socketId, lastSaved: 0, lastTs: ts || 0 });

    const client = redis.getClient();
    if (client) {
      try {
        await client.geoadd(GEO_KEY, Number(lng), Number(lat), key);
      } catch (err) {
        logger.error('Redis geoadd failed', { err });
      }
    }
    this._broadcastAdminTowers();
  }

  async towerOffline(towerId) {
    const key = String(towerId);
    this.towerLocations.delete(key);
    this.towerActiveRide.delete(key);

    const client = redis.getClient();
    if (client) {
      try {
        await Promise.all([
          client.zrem(GEO_KEY, key),
          client.del(ACTIVE_RIDE_KEY(key)),
          client.del(LAST_TS_KEY(key)),
        ]);
      } catch (err) {
        logger.error('Redis cleanup on towerOffline failed', { err });
      }
    }
    this._broadcastAdminTowers();
  }

  // ─── Location update (called from socket event, fire-and-forget) ──────────

  // `ts` is the client device's timestamp (ms) for this fix, not the server's receipt time.
  // Mobile networks can deliver two updates out of order (a slow request landing after a
  // faster later one) — without this guard the display flickers forward then snaps back to
  // the stale position. Any update older than (or equal to) the last one we actually applied
  // for this tower is dropped, regardless of which transport (socket or REST fallback) it
  // came in on or what order it physically arrived in.
  async updateTowerLocation(towerId, lat, lng, socketId, ts) {
    const key = String(towerId);
    const entry = this.towerLocations.get(key) || { lastSaved: 0, lastTs: 0 };

    if (ts && entry.lastTs && Number(ts) <= entry.lastTs) {
      logger.debug(`Dropped stale location update for tower ${towerId} (ts=${ts} <= lastTs=${entry.lastTs})`);
      return;
    }

    const client = redis.getClient();
    if (client && ts) {
      // Best-effort cross-instance check too (get-then-set, not atomic — acceptable here since
      // a duplicate/near-simultaneous update from the same tower across two workers is rare and
      // self-corrects on the next tick; a strict CAS would need a Lua script).
      try {
        const storedTs = await client.get(LAST_TS_KEY(key));
        if (storedTs && Number(ts) <= Number(storedTs)) return;
        await client.set(LAST_TS_KEY(key), String(ts));
      } catch (err) {
        logger.error('Redis lastTs check failed', { err });
      }
    }

    entry.lat = Number(lat);
    entry.lng = Number(lng);
    entry.socketId = socketId;
    if (ts) entry.lastTs = Number(ts);
    this.towerLocations.set(key, entry);

    if (client) {
      client.geoadd(GEO_KEY, Number(lng), Number(lat), key).catch((err) => logger.error('Redis geoadd failed', { err }));
    }

    const rideId = client ? await client.get(ACTIVE_RIDE_KEY(key)).catch(() => null) : this.towerActiveRide.get(key);

    // Push live location to customer on active ride
    if (rideId && this.io) {
      this.io.to(`ride:${rideId}`).emit('ride:tower_location', {
        rideId: Number(rideId),
        towerId: Number(towerId),
        lat,
        lng,
        ts: Date.now(),
      });
    }

    // Push to admin live map
    if (this.io) {
      this.io.to('admin').emit('admin:tower_location', {
        towerId: Number(towerId),
        lat,
        lng,
        ts: Date.now(),
      });
    }

    // Throttle DB save — every 30 s during active ride only
    const now = Date.now();
    if (rideId && now - entry.lastSaved > 30000) {
      entry.lastSaved = now;
      this._saveTracking(rideId, towerId, lat, lng);
    }
  }

  _saveTracking(rideId, towerId, lat, lng) {
    const db = require('../models');
    db.RideTracking.create({
      rideId,
      towerId,
      lat,
      lng,
      recordedAt: new Date(),
    }).catch((err) => logger.error('Tracking save failed', { err }));
  }

  // ─── Dispatch (radius expansion) ──────────────────────────────────────────

  async startDispatch(ride) {
    const search = { timers: [], notifiedTowers: new Set() };
    this.activeSearches.set(ride.id, search);

    // Round 1 — 5 km
    this._notifyTowersInRing(ride, 0, 5, search);

    // Round 2 — expand to 10 km after 60 s
    const t1 = setTimeout(async () => {
      const db = require('../models');
      const current = await db.Ride.findByPk(ride.id);
      if (current && current.status === 'searching') {
        await db.Ride.update({ searchRadiusKm: 10 }, { where: { id: ride.id } });
        this._notifyTowersInRing(ride, 5, 10, search);
        logger.info(`Ride ${ride.id}: expanded to 10 km`);
      }
    }, 60000);
    search.timers.push(t1);

    // Round 3 — expand to 15 km after 120 s
    const t2 = setTimeout(async () => {
      const db = require('../models');
      const current = await db.Ride.findByPk(ride.id);
      if (current && current.status === 'searching') {
        await db.Ride.update({ searchRadiusKm: 15 }, { where: { id: ride.id } });
        this._notifyTowersInRing(ride, 10, 15, search);
        logger.info(`Ride ${ride.id}: expanded to 15 km`);
      }
    }, 120000);
    search.timers.push(t2);

    // Timeout — 180 s no response
    const t3 = setTimeout(async () => {
      const db = require('../models');
      const current = await db.Ride.findByPk(ride.id);
      if (current && current.status === 'searching') {
        await db.Ride.update({ status: 'no_towers_available' }, { where: { id: ride.id } });
        if (this.io) {
          this.io.to(`user:${ride.customerId}`).emit('ride:no_towers', { rideId: ride.id });
        }
        logger.info(`Ride ${ride.id}: no towers available after 3 min`);
        this.activeSearches.delete(ride.id);
        this._broadcastAdminRideUpdate(ride.id, 'no_towers_available');
      }
    }, 180000);
    search.timers.push(t3);
  }

  async _notifyTowersInRing(ride, minKm, maxKm, search) {
    const towers = (await this._getTowersInRing(ride.fromLat, ride.fromLng, minKm, maxKm)).filter(
      (t) => !search.notifiedTowers.has(t.towerId)
    );

    const payload = {
      rideId: ride.id,
      fromAddress: ride.fromAddress,
      fromLat: Number(ride.fromLat),
      fromLng: Number(ride.fromLng),
      toAddress: ride.toAddress,
      toLat: Number(ride.toLat),
      toLng: Number(ride.toLng),
      customerNote: ride.customerNote,
      distanceKm: null,
    };

    for (const t of towers) {
      search.notifiedTowers.add(t.towerId);
      payload.distanceKm = Math.round(t.dist * 10) / 10;
      if (this.io) {
        this.io.to(`user:${t.towerId}`).emit('ride:new_request', payload);
      }
    }

    logger.info(`Ride ${ride.id}: notified ${towers.length} towers in ${minKm}-${maxKm} km ring`);
  }

  // Returns [{ towerId, dist }] for towers between minKm (exclusive) and maxKm (inclusive).
  // Prefers Redis GEOSEARCH (scales to large tower counts + correct across cluster workers);
  // falls back to scanning the in-process Map when Redis isn't configured.
  async _getTowersInRing(lat, lng, minKm, maxKm) {
    const client = redis.getClient();
    if (client) {
      try {
        const results = await client.geosearch(
          GEO_KEY, 'FROMLONLAT', Number(lng), Number(lat), 'BYRADIUS', maxKm, 'km', 'ASC', 'WITHDIST'
        );
        // Each result: [member, distanceStr]
        return results
          .map(([member, distStr]) => ({ towerId: Number(member), dist: Number(distStr) }))
          .filter((t) => t.dist > minKm && t.dist <= maxKm);
      } catch (err) {
        logger.error('Redis geosearch failed, falling back to in-memory scan', { err });
      }
    }

    const results = [];
    for (const [towerId, loc] of this.towerLocations) {
      const dist = haversine(lat, lng, loc.lat, loc.lng);
      if (dist > minKm && dist <= maxKm) {
        results.push({ towerId: Number(towerId), dist });
      }
    }
    return results;
  }

  stopDispatch(rideId) {
    const search = this.activeSearches.get(rideId);
    if (search) {
      search.timers.forEach(clearTimeout);
      this.activeSearches.delete(rideId);
    }
  }

  // ─── Ride lifecycle helpers ────────────────────────────────────────────────

  async towerStartRide(towerId, rideId) {
    const key = String(towerId);
    this.towerActiveRide.set(key, rideId);
    const client = redis.getClient();
    if (client) await client.set(ACTIVE_RIDE_KEY(key), String(rideId)).catch((err) => logger.error('Redis set activeRide failed', { err }));
  }

  async towerEndRide(towerId) {
    const key = String(towerId);
    this.towerActiveRide.delete(key);
    const client = redis.getClient();
    if (client) await client.del(ACTIVE_RIDE_KEY(key)).catch((err) => logger.error('Redis del activeRide failed', { err }));
  }

  // ─── Admin broadcasts ──────────────────────────────────────────────────────

  async _broadcastAdminTowers() {
    if (!this.io) return;
    const towers = await this.getOnlineTowers();
    this.io.to('admin').emit('admin:online_towers', { towers, count: towers.length });
  }

  async _broadcastAdminRideUpdate(rideId, status) {
    if (!this.io) return;
    this.io.to('admin').emit('admin:ride_update', { rideId, status, ts: Date.now() });
  }

  broadcastAdminStats(stats) {
    if (!this.io) return;
    this.io.to('admin').emit('admin:stats', stats);
  }

  // Cluster-wide count/list when Redis is configured; local-process only otherwise.
  async getOnlineTowerCount() {
    const client = redis.getClient();
    if (client) {
      try {
        return await client.zcard(GEO_KEY);
      } catch (err) {
        logger.error('Redis zcard failed, falling back to in-memory count', { err });
      }
    }
    return this.towerLocations.size;
  }

  async getOnlineTowers() {
    const client = redis.getClient();
    if (client) {
      try {
        const withCoords = await client.geosearch(
          GEO_KEY, 'FROMLONLAT', 0, 0, 'BYRADIUS', 20038, 'km', 'ASC', 'WITHCOORD'
        );
        // Each result: [member, [lng, lat]]
        return withCoords.map(([member, [lng, lat]]) => ({
          towerId: Number(member),
          lat: Number(lat),
          lng: Number(lng),
        }));
      } catch (err) {
        logger.error('Redis geosearch failed, falling back to in-memory list', { err });
      }
    }

    const towers = [];
    for (const [towerId, loc] of this.towerLocations) {
      towers.push({ towerId: Number(towerId), lat: loc.lat, lng: loc.lng });
    }
    return towers;
  }
}

module.exports = new DispatchService();
