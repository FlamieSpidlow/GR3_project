const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Ticket = require('../models/Ticket')
const { authenticate } = require('../middleware/auth')
const { createBooking, populateBooking } = require('../services/ticketingService')

const addTickets = async (booking) => {
  if (!booking) return booking
  const plain = typeof booking.toObject === 'function' ? booking.toObject() : booking
  plain.tickets = await Ticket.find({ booking: plain._id }).sort({ lineIndex: 1 })
  return plain
}

router.post('/', authenticate, async (req, res) => {
  try {
    const booking = await createBooking({ user: req.user, payload: req.body, req })
    res.status(201).json({ success: true, data: await addTickets(booking) })
  } catch (err) {
    console.error('Create booking error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi đặt vé' })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await populateBooking(Booking.findOne({ _id: req.params.id, user: req.user._id }))
    if (!booking) return res.status(404).json({ success: false, error: 'Không tìm thấy booking' })
    res.json({ success: true, data: await addTickets(booking) })
  } catch (err) {
    console.error('Get booking error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy booking', details: err.message })
  }
})

router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id })
    if (!booking) return res.status(404).json({ success: false, error: 'Không tìm thấy booking' })
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Chỉ có thể hủy booking đang chờ thanh toán' })
    }

    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    await booking.save()
    await Payment.updateOne({ booking: booking._id, status: { $in: ['pending', 'pending_review'] } }, { status: 'cancelled' })
    await Ticket.updateMany({ booking: booking._id }, { status: 'cancelled' })

    const populated = await populateBooking(Booking.findById(booking._id))
    res.json({ success: true, message: 'Đã hủy booking', data: await addTickets(populated) })
  } catch (err) {
    console.error('Cancel booking error:', err)
    res.status(500).json({ success: false, error: 'Lỗi hủy booking', details: err.message })
  }
})

module.exports = router
