const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Ticket = require('../models/Ticket')
const { authenticate } = require('../middleware/auth')
const { populateBooking } = require('../services/ticketingService')

router.get('/bookings', authenticate, async (req, res) => {
  try {
    const bookings = await populateBooking(
      Booking.find({ user: req.user._id }).sort({ createdAt: -1 })
    )
    res.json({ success: true, data: bookings })
  } catch (err) {
    console.error('Get my bookings error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy booking của tôi', details: err.message })
  }
})

router.get('/tickets', authenticate, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .populate('booking')
      .populate('place', 'name address images')
      .populate('ticketType')
      .sort({ createdAt: -1 })
    res.json({ success: true, data: tickets })
  } catch (err) {
    console.error('Get my tickets error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy vé của tôi', details: err.message })
  }
})

router.get('/tickets/:id', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, user: req.user._id })
      .populate('booking')
      .populate('place', 'name address images')
      .populate('ticketType')
    if (!ticket) return res.status(404).json({ success: false, error: 'Không tìm thấy vé' })
    res.json({ success: true, data: ticket })
  } catch (err) {
    console.error('Get my ticket error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết vé', details: err.message })
  }
})

module.exports = router
