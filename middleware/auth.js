const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey';

const verifyRole = expectedRole => (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.role !== expectedRole) {
      return res.status(403).json({ error: 'Access denied: role mismatch' });
    }

    req.userId = decoded.userId; // or decoded.id if that's what you're signing
    req.role = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { verifyRole };