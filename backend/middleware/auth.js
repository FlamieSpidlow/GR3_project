const User = require('../models/User')

// Middleware xác thực user
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized - No token provided' })
    }
    
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) {
      return res.status(401).json({ success: false, error: 'Invalid token format' })
    }
    
    const userId = token.slice(6)
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }
    
    req.user = user // Gán user vào request
    next()
  } catch (err) {
    res.status(500).json({ success: false, error: 'Authentication failed', details: err.message })
  }
}

// Middleware kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Forbidden - Admin access required' })
  }
  
  next()
}

module.exports = { authenticate, requireAdmin }
