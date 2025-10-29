const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Coach = require('../models/Coach');
const Player = require('../models/Player');

// ✅ Basic token verification (no role check)
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ✅ Role-based access control
const verifyRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed token' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user;
      if (decoded.role === 'admin') {
        user = await Admin.findById(decoded._id);
      } else if (decoded.role === 'coach') {
        user = await Coach.findById(decoded._id);
      } else if (decoded.role === 'player') {
        user = await Player.findById(decoded._id);
      }

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      req.user = user;
      req.user.role = decoded.role;

      next();
    } catch (err) {
      console.error('Auth error:', err);
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};

// ✅ Export both middlewares
module.exports = {
  verifyToken,
  verifyRole,
};