const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const USER_CACHE_TTL_MS = 15 * 1000;
const userAuthCache = new Map();

function getCachedAuthUser(userId) {
  const key = String(userId);
  const entry = userAuthCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    userAuthCache.delete(key);
    return null;
  }
  return entry.user;
}

function setCachedAuthUser(user) {
  if (!user?._id) return;
  const key = String(user._id);
  userAuthCache.set(key, {
    user,
    expiresAt: Date.now() + USER_CACHE_TTL_MS,
  });
}

function invalidateUserAuthCache(userId) {
  if (!userId) return;
  userAuthCache.delete(String(userId));
}

const protect = async (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith('Bearer')
  ) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    // Older deployments issued expiring JWTs without a session id. Continue to
    // accept their signed tokens and migrate them to a revocable persistent
    // session instead of forcing users to sign in again at token expiry.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const sessionId = decoded.sid || crypto.createHash('sha256').update(token).digest('hex');

    let user = getCachedAuthUser(decoded.id);
    if (!user) {
      // Keep this in one projection: chaining a negative selection and then a
      // `+` selection can cause Mongoose to drop the explicitly included field.
      // Without authSessions, every newly issued sid looks revoked immediately.
      user = await User.findById(decoded.id).select('-password +authSessions').lean();
      if (user) {
        user.id = String(user._id);
        setCachedAuthUser(user);
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    let sessionIsActive = user.authSessions?.some(
      (session) => session.sessionId === sessionId,
    );
    // If session wasn't found in cached user (e.g. newly logged in on another tab),
    // re-check fresh from DB once before rejecting.
    if (!sessionIsActive) {
      const freshUser = await User.findById(decoded.id).select('-password +authSessions').lean();
      if (!freshUser) {
        invalidateUserAuthCache(decoded.id);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      freshUser.id = String(freshUser._id);
      user = freshUser;
      setCachedAuthUser(user);
      sessionIsActive = user.authSessions?.some(
        (session) => session.sessionId === sessionId,
      );
    }

    if (decoded.sid && !sessionIsActive) {
      return res.status(401).json({ message: 'Not authorized, session ended' });
    }
    if (!decoded.sid && !sessionIsActive) {
      const createdAt = new Date();
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { authSessions: { sessionId, createdAt } } },
      );
      user.authSessions = [...(user.authSessions || []), { sessionId, createdAt }];
      setCachedAuthUser(user);
    }
    req.user = user;
    req.authSessionId = sessionId;

    return next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
};

module.exports = { protect, adminOnly, invalidateUserAuthCache };
