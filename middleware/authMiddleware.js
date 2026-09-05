const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'student_hub_super_secret_jwt_key_2026';

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Middleware to extract user from Authorization header or cookie
function authenticate(req, res, next) {
  let token = null;

  // 1. Check Authorization Header (Bearer token)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Check Cookie (if cookie-parser is used)
  if (!token && req.cookies && req.cookies.student_token) {
    token = req.cookies.student_token;
  }

  // 3. Check query param (useful for direct PDF links in iframe/embed)
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    req.user = null;
    return next();
  }

  const user = db.findUserById(decoded.id);
  if (!user) {
    req.user = null;
    return next();
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    rollNo: user.rollNo,
    year: user.year,
    department: user.department,
    role: user.role
  };

  next();
}

// Ensure student or admin is logged in
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to access this resource.'
    });
  }
  next();
}

// Ensure admin only
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authenticate,
  requireAuth,
  requireAdmin
};
