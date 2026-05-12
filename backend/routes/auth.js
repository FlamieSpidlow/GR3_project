const express = require('express')
const router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const crypto = require('crypto')

// Đăng ký người dùng
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, parentName, address, role } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      parentName,
      address,
      role: role || 'user'
    })

    await newUser.save()
    res.status(201).json({ success: true, message: 'Đăng ký thành công', userId: newUser._id })
  } catch (err) {
    res.status(400).json({ success: false, error: 'Lỗi đăng ký', details: err.message })
  }
})

// Đăng nhập người dùng
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await User.findOne({ username })
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ success: false, error: 'Sai mật khẩu' })

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token: 'token_' + user._id,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        parentName: user.parentName,
        address: user.address,
        lat: user.lat,
        lng: user.lng,
        numberOfKids: user.numberOfKids,
        role: user.role,
        searchHistory: user.searchHistory || []
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi đăng nhập', details: err.message })
  }
})

// Quên mật khẩu - gửi mã xác nhận
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, error: 'Email là bắt buộc' })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    // generate 6-digit code
    const code = ('' + (Math.floor(Math.random() * 900000) + 100000))
    user.resetCode = code
    user.resetExpires = Date.now() + 15 * 60 * 1000 // 15 minutes
    await user.save()

    // send email using nodemailer if configured
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.FROM_EMAIL || smtpUser

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort) || 587,
        secure: Number(smtpPort) === 465, // true for 465, false for other ports
        auth: { user: smtpUser, pass: smtpPass }
      })

      const mail = {
        from: fromEmail,
        to: user.email,
        subject: 'Mã đặt lại mật khẩu của TheWeekend',
        text: `Mã xác nhận của bạn là: ${code}. Mã có hiệu lực trong 15 phút.`,
        html: `<p>Mã xác nhận của bạn là: <strong>${code}</strong></p><p>Mã có hiệu lực trong 15 phút.</p>`
      }

      await transporter.sendMail(mail)
      return res.json({ success: true, message: 'Mã xác thực đã được gửi tới email của bạn' })
    }

    // If mail server not configured, return code in response for development/testing
    console.warn('SMTP not configured - returning reset code in response for dev')
    return res.json({ success: true, message: 'Mã xác thực (dev) được tạo', code })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi xử lý yêu cầu', details: err.message })
  }
})

// Reset mật khẩu - xác nhận mã và cập nhật mật khẩu
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    if (!email || !code || !newPassword) return res.status(400).json({ success: false, error: 'Thiếu thông tin' })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    if (!user.resetCode || !user.resetExpires) return res.status(400).json({ success: false, error: 'Không có yêu cầu đặt lại mật khẩu' })
    if (user.resetCode !== code) return res.status(400).json({ success: false, error: 'Mã xác thực không hợp lệ' })
    if (Date.now() > user.resetExpires) return res.status(400).json({ success: false, error: 'Mã xác thực đã hết hạn' })

    const hashed = await bcrypt.hash(newPassword, 10)
    user.password = hashed
    user.resetCode = undefined
    user.resetExpires = undefined
    await user.save()

    res.json({ success: true, message: 'Mật khẩu đã được cập nhật' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi đặt lại mật khẩu', details: err.message })
  }
})

// Cập nhật thông tin người dùng (yêu cầu token dạng 'token_<userId>' trong Authorization header)
router.put('/profile', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json')
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' })
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) return res.status(401).json({ success: false, error: 'Invalid token' })
    const userId = token.slice(6)

    const { parentName, address, email, avatar } = req.body
    if (!parentName && !address && !email) return res.status(400).json({ success: false, error: 'Không có trường để cập nhật' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    // nếu thay đổi email, kiểm tra trùng
    if (email && email !== user.email) {
      const ex = await User.findOne({ email })
      if (ex) return res.status(400).json({ success: false, error: 'Email đã được sử dụng' })
      user.email = email
    }
    if (parentName) user.parentName = parentName
    if (address) user.address = address
    if (avatar) user.avatar = avatar

    await user.save()

    res.json({ success: true, message: 'Cập nhật thành công', user: {
      id: user._id,
      username: user.username,
      email: user.email,
      parentName: user.parentName,
      address: user.address,
      avatar: user.avatar,
      role: user.role
    }})
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi cập nhật thông tin', details: err.message })
  }
})

// Lấy thông tin hồ sơ người dùng
router.get('/profile', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json')
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' })
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) return res.status(401).json({ success: false, error: 'Invalid token' })
    const userId = token.slice(6)

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    res.json({ success: true, user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      parentName: user.parentName,
      address: user.address,
      lat: user.lat,
      lng: user.lng,
      numberOfKids: user.numberOfKids,
      role: user.role,
      searchHistory: user.searchHistory || []
    }})
  } catch (err) {
    console.error('Get profile error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi lấy thông tin hồ sơ', details: err.message })
  }
})

// Đổi mật khẩu (yêu cầu token Bearer 'token_<userId>')
router.post('/change-password', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json')
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' })
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) return res.status(401).json({ success: false, error: 'Invalid token' })
    const userId = token.slice(6)

    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Thiếu thông tin' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(401).json({ success: false, error: 'Mật khẩu hiện tại không đúng' })

    const hashed = await bcrypt.hash(newPassword, 10)
    user.password = hashed
    await user.save()

    res.json({ success: true, message: 'Mật khẩu đã được cập nhật' })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi đổi mật khẩu', details: err.message })
  }
})

// Cập nhật vị trí người dùng
router.put('/location', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' })
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) return res.status(401).json({ success: false, error: 'Invalid token' })
    const userId = token.slice(6)

    const { lat, lng, address } = req.body
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    if (lat !== undefined) user.lat = lat
    if (lng !== undefined) user.lng = lng
    if (address) user.address = address

    await user.save()
    res.json({ success: true, message: 'Cập nhật vị trí thành công', user: {
      lat: user.lat,
      lng: user.lng,
      address: user.address
    }})
  } catch (err) {
    console.error('Update location error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi cập nhật vị trí', details: err.message })
  }
})

// Lưu lịch sử tìm kiếm
router.post('/search-history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' })
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) return res.status(401).json({ success: false, error: 'Invalid token' })
    const userId = token.slice(6)

    const { query } = req.body
    if (!query || !query.trim()) return res.status(400).json({ success: false, error: 'Query is required' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    // Thêm vào đầu mảng, giữ tối đa 20 mục
    if (!user.searchHistory) user.searchHistory = []
    
    // Xóa nếu đã có query này trước đó
    user.searchHistory = user.searchHistory.filter(h => h.query !== query.trim())
    
    // Thêm vào đầu
    user.searchHistory.unshift({ query: query.trim(), timestamp: new Date() })
    
    // Giữ tối đa 20 mục
    if (user.searchHistory.length > 20) {
      user.searchHistory = user.searchHistory.slice(0, 20)
    }

    await user.save()
    res.json({ success: true, searchHistory: user.searchHistory })
  } catch (err) {
    console.error('Save search history error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi lưu lịch sử', details: err.message })
  }
})

// Xóa lịch sử tìm kiếm
router.delete('/search-history', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' })
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) return res.status(401).json({ success: false, error: 'Invalid token' })
    const userId = token.slice(6)

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })

    user.searchHistory = []
    await user.save()

    res.json({ success: true, message: 'Đã xóa lịch sử tìm kiếm' })
  } catch (err) {
    console.error('Clear search history error:', err)
    res.status(500).json({ success: false, error: 'Lỗi khi xóa lịch sử', details: err.message })
  }
})

module.exports = router


