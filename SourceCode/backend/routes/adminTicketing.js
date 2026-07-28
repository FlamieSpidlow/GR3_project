const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const PaymentLog = require('../models/PaymentLog')
const Ticket = require('../models/Ticket')
const { authenticate, requireAdmin, requireStaffOrAdmin } = require('../middleware/auth')
const { populateBooking } = require('../services/ticketingService')

router.get('/bookings', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const { status = '', limit = 200 } = req.query
    const query = status ? { status } : {}
    const bookings = await populateBooking(
      Booking.find(query).sort({ createdAt: -1 }).limit(Math.min(Number.parseInt(limit, 10) || 200, 500))
    )
    res.json({ success: true, data: bookings })
  } catch (err) {
    console.error('Admin bookings alias error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy booking', details: err.message })
  }
})

router.get('/payments', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status = '', provider = '', limit = 200 } = req.query
    const query = {}
    if (status) query.status = status
    if (provider) query.provider = provider
    const payments = await Payment.find(query)
      .populate('booking')
      .populate('user', 'username email parentName phone')
      .sort({ createdAt: -1 })
      .limit(Math.min(Number.parseInt(limit, 10) || 200, 500))
    res.json({ success: true, data: payments })
  } catch (err) {
    console.error('Admin payments alias error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy thanh toán', details: err.message })
  }
})

router.get('/payment-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const logs = await PaymentLog.find({})
      .populate('actor', 'username email parentName role')
      .sort({ createdAt: -1 })
      .limit(300)
    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('Admin payment logs alias error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy payment logs', details: err.message })
  }
})

router.get('/tickets', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const { status = '', limit = 200 } = req.query
    const query = status ? { status } : {}
    const tickets = await Ticket.find(query)
      .populate('booking')
      .populate('place', 'name address')
      .populate('user', 'username email parentName phone')
      .sort({ createdAt: -1 })
      .limit(Math.min(Number.parseInt(limit, 10) || 200, 500))
    res.json({ success: true, data: tickets })
  } catch (err) {
    console.error('Admin tickets alias error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy tickets', details: err.message })
  }
})

const parseTicketCode = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    return String(parsed.ticketCode || parsed.code || '').trim()
  } catch (_) {
    return raw
  }
}

const extractTicketCode = (body = {}) => {
  return parseTicketCode(body.ticketCode) || parseTicketCode(body.qrToken) || parseTicketCode(body.qrPayload)
}

router.post('/checkin/verify', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const code = extractTicketCode(req.body)
    if (!code) return res.status(400).json({ success: false, error: 'Thiếu mã vé' })
    const ticket = await Ticket.findOne({ code })
      .populate('booking')
      .populate('place', 'name address')
      .populate('user', 'username email parentName phone')
    if (!ticket) return res.status(404).json({ success: false, error: 'Không tìm thấy vé' })
    res.json({ success: true, data: ticket })
  } catch (err) {
    console.error('Verify ticket error:', err)
    res.status(500).json({ success: false, error: 'Lỗi kiểm tra vé', details: err.message })
  }
})

router.post('/checkin/use', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const code = extractTicketCode(req.body)
    if (!code) return res.status(400).json({ success: false, error: 'Thiếu mã vé' })
    const ticket = await Ticket.findOne({ code }).populate('booking')
    if (!ticket) return res.status(404).json({ success: false, error: 'Không tìm thấy vé' })
    if (ticket.status === 'used') return res.status(409).json({ success: false, error: 'Vé đã được sử dụng', data: ticket })
    if (!['valid', 'paid'].includes(ticket.status)) return res.status(400).json({ success: false, error: `Vé không hợp lệ ở trạng thái ${ticket.status}` })

    const visitDay = new Date(ticket.visitDate)
    visitDay.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (visitDay < today) {
      ticket.status = 'expired'
      await ticket.save()
      return res.status(400).json({ success: false, error: 'Vé đã hết hạn', data: ticket })
    }

    ticket.status = 'used'
    ticket.usedAt = new Date()
    ticket.checkedInBy = req.user._id
    await ticket.save()

    res.json({ success: true, message: 'Check-in vé thành công', data: ticket })
  } catch (err) {
    console.error('Use ticket error:', err)
    res.status(500).json({ success: false, error: 'Lỗi check-in vé', details: err.message })
  }
})

module.exports = router
