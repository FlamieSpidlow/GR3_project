const jwt = require('jsonwebtoken')
const User = require('../models/User')

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in backend/.env')
}

const verifyAuthToken = async (token) => {
  if (!token) return null
  const decoded = jwt.verify(token, JWT_SECRET)
  if (!decoded || !decoded.id) return null
  return User.findById(decoded.id)
}

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized - No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const user = await verifyAuthToken(token)
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }

    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ success: false, error: 'Authentication failed', details: err.message })
  }
}

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden - Admin access required' })
  }

  next()
}

module.exports = { authenticate, requireAdmin, verifyAuthToken, JWT_SECRET }
