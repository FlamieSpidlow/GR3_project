const express = require('express')
const router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const { authenticate, JWT_SECRET } = require('../middleware/auth')

const buildUserResponse = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  parentName: user.parentName,
  address: user.address,
  lat: user.lat,
  lng: user.lng,
  role: user.role,
  searchHistory: user.searchHistory || [],
  favorites: user.favorites || []
})

const signToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role },
  JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
)

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, parentName, address } = req.body
    if (!username || !email || !password || !parentName || !address) {
      return res.status(400).json({ success: false, error: 'Thieu thong tin bat buoc' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      parentName,
      address,
      role: 'user'
    })

    await newUser.save()
    res.status(201).json({ success: true, message: 'Dang ky thanh cong', userId: newUser._id })
  } catch (err) {
    res.status(400).json({ success: false, error: 'Loi dang ky', details: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await User.findOne({ username })
    if (!user) return res.status(404).json({ success: false, error: 'Khong tim thay nguoi dung' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ success: false, error: 'Sai mat khau' })

    res.status(200).json({
      success: true,
      message: 'Dang nhap thanh cong',
      token: signToken(user),
      user: buildUserResponse(user)
    })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Loi dang nhap', details: err.message })
  }
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, error: 'Email la bat buoc' })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ success: false, error: 'Khong tim thay nguoi dung' })

    const code = String(Math.floor(Math.random() * 900000) + 100000)
    user.resetCode = code
    user.resetExpires = Date.now() + 15 * 60 * 1000
    await user.save()

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const fromEmail = process.env.FROM_EMAIL || smtpUser

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort) || 587,
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass }
      })

      await transporter.sendMail({
        from: fromEmail,
        to: user.email,
        subject: 'Ma dat lai mat khau cua TheWeekend',
        text: `Ma xac nhan cua ban la: ${code}. Ma co hieu luc trong 15 phut.`,
        html: `<p>Ma xac nhan cua ban la: <strong>${code}</strong></p><p>Ma co hieu luc trong 15 phut.</p>`
      })
      return res.json({ success: true, message: 'Ma xac thuc da duoc gui toi email cua ban' })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn('SMTP not configured - returning reset code in response for local development')
      return res.json({ success: true, message: 'Ma xac thuc da duoc tao cho moi truong local', code })
    }

    console.error('SMTP not configured - cannot send reset code in production')
    return res.status(503).json({
      success: false,
      error: 'He thong email chua duoc cau hinh. Vui long thu lai sau.'
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ success: false, error: 'Loi khi xu ly yeu cau', details: err.message })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    if (!email || !code || !newPassword) return res.status(400).json({ success: false, error: 'Thieu thong tin' })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ success: false, error: 'Khong tim thay nguoi dung' })

    if (!user.resetCode || !user.resetExpires) return res.status(400).json({ success: false, error: 'Khong co yeu cau dat lai mat khau' })
    if (user.resetCode !== code) return res.status(400).json({ success: false, error: 'Ma xac thuc khong hop le' })
    if (Date.now() > user.resetExpires) return res.status(400).json({ success: false, error: 'Ma xac thuc da het han' })

    user.password = await bcrypt.hash(newPassword, 10)
    user.resetCode = undefined
    user.resetExpires = undefined
    await user.save()

    res.json({ success: true, message: 'Mat khau da duoc cap nhat' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ success: false, error: 'Loi khi dat lai mat khau', details: err.message })
  }
})

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { parentName, address, email, avatar } = req.body
    if (!parentName && !address && !email && !avatar) {
      return res.status(400).json({ success: false, error: 'Khong co truong de cap nhat' })
    }

    const user = req.user
    if (email && email !== user.email) {
      const existing = await User.findOne({ email })
      if (existing) return res.status(400).json({ success: false, error: 'Email da duoc su dung' })
      user.email = email
    }
    if (parentName) user.parentName = parentName
    if (address) user.address = address
    if (avatar) user.avatar = avatar

    await user.save()
    res.json({ success: true, message: 'Cap nhat thanh cong', user: buildUserResponse(user) })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ success: false, error: 'Loi khi cap nhat thong tin', details: err.message })
  }
})

router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({ success: true, user: buildUserResponse(req.user) })
  } catch (err) {
    console.error('Get profile error:', err)
    res.status(500).json({ success: false, error: 'Loi khi lay thong tin ho so', details: err.message })
  }
})

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Thieu thong tin' })

    const user = req.user
    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) return res.status(401).json({ success: false, error: 'Mat khau hien tai khong dung' })

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.json({ success: true, message: 'Mat khau da duoc cap nhat' })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ success: false, error: 'Loi khi doi mat khau', details: err.message })
  }
})

router.put('/location', authenticate, async (req, res) => {
  try {
    const { lat, lng, address } = req.body
    const user = req.user

    if (lat !== undefined) user.lat = lat
    if (lng !== undefined) user.lng = lng
    if (address) user.address = address

    await user.save()
    res.json({
      success: true,
      message: 'Cap nhat vi tri thanh cong',
      user: { lat: user.lat, lng: user.lng, address: user.address }
    })
  } catch (err) {
    console.error('Update location error:', err)
    res.status(500).json({ success: false, error: 'Loi khi cap nhat vi tri', details: err.message })
  }
})

router.post('/search-history', authenticate, async (req, res) => {
  try {
    const { query } = req.body
    if (!query || !query.trim()) return res.status(400).json({ success: false, error: 'Query is required' })

    const user = req.user
    if (!user.searchHistory) user.searchHistory = []
    const trimmedQuery = query.trim()
    user.searchHistory = user.searchHistory.filter(h => h.query !== trimmedQuery)
    user.searchHistory.unshift({ query: trimmedQuery, timestamp: new Date() })
    if (user.searchHistory.length > 20) user.searchHistory = user.searchHistory.slice(0, 20)

    await user.save()
    res.json({ success: true, searchHistory: user.searchHistory })
  } catch (err) {
    console.error('Save search history error:', err)
    res.status(500).json({ success: false, error: 'Loi khi luu lich su', details: err.message })
  }
})

router.delete('/search-history', authenticate, async (req, res) => {
  try {
    const user = req.user
    user.searchHistory = []
    await user.save()

    res.json({ success: true, message: 'Da xoa lich su tim kiem' })
  } catch (err) {
    console.error('Clear search history error:', err)
    res.status(500).json({ success: false, error: 'Loi khi xoa lich su', details: err.message })
  }
})

router.put('/favorites/:placeId', authenticate, async (req, res) => {
  try {
    const { placeId } = req.params
    const { favorited } = req.body || {}
    if (!placeId) return res.status(400).json({ success: false, error: 'Place id is required' })

    const user = req.user
    if (!Array.isArray(user.favorites)) user.favorites = []

    if (favorited) {
      if (!user.favorites.includes(placeId)) user.favorites.push(placeId)
    } else {
      user.favorites = user.favorites.filter(id => id !== placeId)
    }

    await user.save()
    res.json({ success: true, favorites: user.favorites })
  } catch (err) {
    console.error('Update favorite error:', err)
    res.status(500).json({ success: false, error: 'Loi khi cap nhat yeu thich', details: err.message })
  }
})

module.exports = router
