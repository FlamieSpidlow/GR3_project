const express = require('express')
const Notification = require('../models/Notification')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

const ALLOWED_TYPES = new Set(['info', 'success', 'warning', 'error'])

function serializeNotification(notification) {
  return {
    id: notification._id.toString(),
    title: notification.title || '',
    message: notification.message || '',
    type: notification.type || 'info',
    read: !!notification.read,
    createdAt: notification.createdAt
  }
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100)
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    res.json({
      success: true,
      data: notifications.map(serializeNotification)
    })
  } catch (err) {
    console.error('Get notifications error:', err)
    res.status(500).json({ success: false, error: 'Khong the tai thong bao', details: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const title = cleanText(req.body.title, 160)
    const message = cleanText(req.body.message, 1000)
    const type = ALLOWED_TYPES.has(req.body.type) ? req.body.type : 'info'

    if (!title && !message) {
      return res.status(400).json({ success: false, error: 'Thong bao can co tieu de hoac noi dung' })
    }

    const notification = await Notification.create({
      user: req.user._id,
      title,
      message,
      type,
      read: false
    })

    res.status(201).json({ success: true, data: serializeNotification(notification) })
  } catch (err) {
    console.error('Create notification error:', err)
    res.status(500).json({ success: false, error: 'Khong the tao thong bao', details: err.message })
  }
})

router.patch('/read', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } })
    res.json({ success: true })
  } catch (err) {
    console.error('Mark notifications read error:', err)
    res.status(500).json({ success: false, error: 'Khong the cap nhat thong bao', details: err.message })
  }
})

router.delete('/', async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id })
    res.json({ success: true })
  } catch (err) {
    console.error('Clear notifications error:', err)
    res.status(500).json({ success: false, error: 'Khong the xoa thong bao', details: err.message })
  }
})

module.exports = router
