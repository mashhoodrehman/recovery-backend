const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const TOKEN_TTL_SECONDS = 3600; // 1 hour — client re-fetches if a call runs longer

let RtcTokenBuilder = null;
let RtcRole = null;
let loadTried = false;

const getAgoraSdk = () => {
  if (loadTried) return RtcTokenBuilder ? { RtcTokenBuilder, RtcRole } : null;
  loadTried = true;
  if (!env.agora.appId || !env.agora.appCertificate) {
    logger.warn('Agora not configured (AGORA_APP_ID/AGORA_APP_CERTIFICATE missing) — call endpoints will fail');
    return null;
  }
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const agora = require('agora-token');
  RtcTokenBuilder = agora.RtcTokenBuilder;
  RtcRole = agora.RtcRole;
  return { RtcTokenBuilder, RtcRole };
};

// channelName: unique per ride (e.g. `ride_42`); uid: the calling user's numeric id
const generateRtcToken = (channelName, uid) => {
  const sdk = getAgoraSdk();
  if (!sdk) throw ApiError.internal('Voice calling is not configured on this server');

  const expireAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = sdk.RtcTokenBuilder.buildTokenWithUid(
    env.agora.appId,
    env.agora.appCertificate,
    channelName,
    uid,
    sdk.RtcRole.PUBLISHER,
    expireAt,
    expireAt
  );

  return { appId: env.agora.appId, channel: channelName, uid, token, expiresAt: expireAt };
};

module.exports = { generateRtcToken };
