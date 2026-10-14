const UserLog = require('../models/UserLog');

function normalizeValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) return Object.fromEntries(value);
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function valuesMatch(previousValue, newValue) {
  return JSON.stringify(normalizeValue(previousValue)) === JSON.stringify(normalizeValue(newValue));
}

function displayValue(value) {
  const normalized = normalizeValue(value);
  if (normalized === null || normalized === '') return 'empty';
  if (Array.isArray(normalized)) {
    return normalized.length > 0 ? normalized.map(displayValue).join(', ') : 'none';
  }
  if (typeof normalized === 'object') {
    return JSON.stringify(normalized);
  }
  return String(normalized);
}

function changed(field, label, previousValue, newValue, message) {
  if (valuesMatch(previousValue, newValue)) return null;
  return {
    field,
    label,
    type: 'changed',
    message: message || `Changed ${label} from ${displayValue(previousValue)} to ${displayValue(newValue)}.`,
    previousValue: normalizeValue(previousValue),
    newValue: normalizeValue(newValue),
  };
}

function added(field, label, newValue, message) {
  return {
    field,
    label,
    type: 'added',
    message: message || `Added ${label}: ${displayValue(newValue)}.`,
    previousValue: null,
    newValue: normalizeValue(newValue),
  };
}

function removed(field, label, previousValue, message) {
  return {
    field,
    label,
    type: 'removed',
    message: message || `Deleted ${label}: ${displayValue(previousValue)}.`,
    previousValue: normalizeValue(previousValue),
    newValue: null,
  };
}

function clientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const value = raw || req.ip || req.socket?.remoteAddress || '';
  return String(value).split(',')[0].trim() || 'Unknown IP';
}

function inferDevice(userAgent = '') {
  const ua = String(userAgent);
  const type = /ipad|tablet/i.test(ua)
    ? 'Tablet'
    : /mobile|android|iphone|ipod/i.test(ua)
      ? 'Mobile'
      : 'Desktop';
  const os = /windows/i.test(ua)
    ? 'Windows'
    : /mac os|macintosh/i.test(ua)
      ? 'macOS'
      : /android/i.test(ua)
        ? 'Android'
        : /iphone|ipad|ipod/i.test(ua)
          ? 'iOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const browser = /edg/i.test(ua)
    ? 'Edge'
    : /chrome|crios/i.test(ua)
      ? 'Chrome'
      : /firefox|fxios/i.test(ua)
        ? 'Firefox'
        : /safari/i.test(ua)
          ? 'Safari'
          : '';
  return browser ? `${os} ${type} (${browser})` : `${os} ${type}`;
}

function requestLocation(req) {
  const city = req.headers['cf-ipcity'] || req.headers['x-vercel-ip-city'];
  const region = req.headers['cf-region'] || req.headers['x-vercel-ip-country-region'];
  const country = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'];
  const parts = [city, region, country].map((part) => String(part || '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}

function requestContext(req) {
  const userAgent = String(req.headers['user-agent'] || '');
  return {
    ipAddress: clientIp(req),
    userAgent,
    device: inferDevice(userAgent),
    location: requestLocation(req),
  };
}

async function createUserLog(req, input) {
  try {
    const userId = input.userId || req.user?._id;
    if (!userId) return null;
    const context = requestContext(req);
    const actor = req.user || {};
    return UserLog.create({
      userId,
      userName: input.userName || actor.name || actor.email || input.fallbackUserName || 'Unknown user',
      actorId: input.actorId || actor._id || userId,
      actorName: input.actorName || actor.name || actor.email || input.fallbackUserName || 'Unknown user',
      category: input.category,
      action: input.action,
      message: input.message,
      changes: (input.changes || []).filter(Boolean),
      metadata: {
        ...(input.metadata || {}),
        ipAddress: context.ipAddress,
        device: context.device,
        location: context.location,
      },
      ...context,
    });
  } catch (error) {
    console.error('Failed to create user log:', error);
    return null;
  }
}

async function createUserLogs(req, inputs) {
  try {
    const userId = req.user?._id;
    if (!userId || !Array.isArray(inputs) || inputs.length === 0) return [];
    const context = requestContext(req);
    const actor = req.user || {};
    const logs = inputs.map((input) => ({
      userId: input.userId || userId,
      userName: input.userName || actor.name || actor.email || input.fallbackUserName || 'Unknown user',
      actorId: input.actorId || actor._id || userId,
      actorName: input.actorName || actor.name || actor.email || input.fallbackUserName || 'Unknown user',
      category: input.category,
      action: input.action,
      message: input.message,
      changes: (input.changes || []).filter(Boolean),
      metadata: {
        ...(input.metadata || {}),
        ipAddress: context.ipAddress,
        device: context.device,
        location: context.location,
      },
      ...context,
    }));
    return await UserLog.insertMany(logs, { ordered: false });
  } catch (error) {
    console.error('Failed to create user logs:', error);
    return [];
  }
}

module.exports = {
  added,
  changed,
  createUserLog,
  createUserLogs,
  displayValue,
  removed,
  requestContext,
  valuesMatch,
};
