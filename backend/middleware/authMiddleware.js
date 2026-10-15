const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

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
    // Keep this in one projection: chaining a negative selection and then a
    // `+` selection can cause Mongoose to drop the explicitly included field.
    // Without authSessions, every newly issued sid looks revoked immediately.
    const userQuery = User.findById(decoded.id).select('-password +authSessions');
    req.user = await userQuery;

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    const sessionIsActive = req.user.authSessions?.some(
      (session) => session.sessionId === sessionId,
    );
    if (decoded.sid && !sessionIsActive) {
      return res.status(401).json({ message: 'Not authorized, session ended' });
    }
    if (!decoded.sid && !sessionIsActive) {
      await User.updateOne(
        { _id: req.user._id },
        { $addToSet: { authSessions: { sessionId, createdAt: new Date() } } },
      );
    }
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

module.exports = { protect, adminOnly };
