const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const PaymentLog = require('../models/PaymentLog')
const Ticket = require('../models/Ticket')
const TicketType = require('../models/TicketType')
const { authenticate, requireAdmin, requireStaffOrAdmin } = require('../middleware/auth')
const {
  createBooking,
  ensureDefaultTicketTypes,
  expirePastTickets,
  getPublicOrigin,
  handlePayosWebhook,
  populateBooking,
  refreshPayosPaymentStatus
} = require('../services/ticketingService')

const statusToLegacyPayment = (status) => status === 'paid' ? 'paid' : 'unpaid'

const addLegacyFields = (booking) => {
  if (!booking) return booking
  const plain = typeof booking.toObject === 'function' ? booking.toObject() : booking
  const adult = (plain.items || []).filter(i => i.audience === 'adult').reduce((sum, i) => sum + (i.quantity || 0), 0)
  const child = (plain.items || []).filter(i => i.audience === 'child').reduce((sum, i) => sum + (i.quantity || 0), 0)
  return {
    ...plain,
    totalPrice: plain.totalAmount,
    adultQuantity: adult,
    childQuantity: child || Math.max(0, (plain.totalQuantity || 0) - adult),
    paymentStatus: statusToLegacyPayment(plain.status),
    ticketCode: plain.code
  }
}

const addTickets = async (booking) => {
  const plain = addLegacyFields(booking)
  if (!plain?._id) return plain
  plain.tickets = await Ticket.find({ booking: plain._id }).sort({ lineIndex: 1 })
  return plain
}

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

router.get('/payment-origin', (req, res) => {
  const origin = getPublicOrigin(req)
  if (!origin) {
    return res.status(500).json({ success: false, error: 'Không thể xác định địa chỉ website công khai' })
  }
  res.json({ success: true, origin })
})

router.get('/places/:placeId/ticket-types', async (req, res) => {
  try {
    const Place = require('../models/Place')
    const place = await Place.findById(req.params.placeId)
    if (!place) return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })
    const ticketTypes = await ensureDefaultTicketTypes(place)
    res.json({ success: true, data: ticketTypes })
  } catch (err) {
    console.error('Get ticket types error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy loại vé', details: err.message })
  }
})

router.post('/', authenticate, async (req, res) => {
  try {
    const booking = await createBooking({ user: req.user, payload: req.body, req })
    res.status(201).json({
      success: true,
      message: 'Đã tạo đơn đặt vé. Vui lòng thanh toán bằng PayOS để hoàn tất.',
      data: addLegacyFields(booking)
    })
  } catch (err) {
    console.error('Create booking error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi đặt vé' })
  }
})

router.post('/bookings', authenticate, async (req, res) => {
  try {
    const booking = await createBooking({ user: req.user, payload: req.body, req })
    res.status(201).json({ success: true, data: addLegacyFields(booking) })
  } catch (err) {
    console.error('Create booking error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi đặt vé' })
  }
})

router.get('/my', authenticate, async (req, res) => {
  try {
    // Vé chưa dùng mà đã qua ngày đi thì tự chuyển 'expired' trước khi trả về
    await expirePastTickets({ user: req.user._id })
    const bookings = await populateBooking(
      Booking.find({ user: req.user._id }).sort({ createdAt: -1 })
    )
    const data = await Promise.all(bookings.map(addTickets))
    res.json({ success: true, data })
  } catch (err) {
    console.error('Get my bookings error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách vé', details: err.message })
  }
})

router.get('/admin', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    // Vé chưa dùng mà đã qua ngày đi thì tự chuyển 'expired' trước khi trả về
    await expirePastTickets()
    const { status = '', limit = 200 } = req.query
    const query = {}
    if (status) query.status = status
    const bookings = await populateBooking(
      Booking.find(query)
        .sort({ createdAt: -1 })
        .limit(Math.min(Number.parseInt(limit, 10) || 200, 500))
    )
    const data = await Promise.all(bookings.map(addTickets))
    res.json({ success: true, data })
  } catch (err) {
    console.error('Get admin bookings error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách đặt vé', details: err.message })
  }
})

router.get('/admin/payments', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status = '', limit = 200 } = req.query
    const query = { provider: 'payos' }
    if (status) query.status = status
    const payments = await Payment.find(query)
      .populate('booking')
      .populate('user', 'username email parentName phone')
      .sort({ createdAt: -1 })
      .limit(Math.min(Number.parseInt(limit, 10) || 200, 500))
    res.json({ success: true, data: payments })
  } catch (err) {
    console.error('Get payments error:', err)
    res.status(500).json({ success: false, error: 'Lỗi đối soát thanh toán', details: err.message })
  }
})

router.get('/admin/payment-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const logs = await PaymentLog.find({})
      .populate('actor', 'username email parentName role')
      .sort({ createdAt: -1 })
      .limit(300)
    res.json({ success: true, data: logs })
  } catch (err) {
    console.error('Get payment logs error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy log thanh toán', details: err.message })
  }
})

router.post('/payos/webhook', async (req, res) => {
  try {
    const result = await handlePayosWebhook(req.body || {})
    res.json({ success: result.success, code: result.code, message: result.message })
  } catch (err) {
    console.error('payOS webhook error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi webhook PayOS' })
  }
})

router.get('/:id/payment-status', authenticate, async (req, res) => {
  try {
    let booking = await populateBooking(
      Booking.findOne({ _id: req.params.id, user: req.user._id })
    )
    if (!booking) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })
    if (booking.payment?.provider === 'payos' && ['pending', 'pending_review'].includes(booking.payment.status)) {
      try {
        await refreshPayosPaymentStatus(booking.payment)
        booking = await populateBooking(
          Booking.findOne({ _id: req.params.id, user: req.user._id })
        )
      } catch (payosErr) {
        console.warn('Refresh payOS payment status failed:', payosErr.message)
      }
    }
    const data = await addTickets(booking)
    res.json({
      success: true,
      data,
      paymentStatus: data.paymentStatus,
      status: data.status,
      paidAt: data.paidAt
    })
  } catch (err) {
    console.error('Get payment status error:', err)
    res.status(500).json({ success: false, error: 'Lỗi kiểm tra trạng thái thanh toán', details: err.message })
  }
})

router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id })
    if (!booking) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })
    if (!['pending'].includes(booking.status)) {
      return res.status(400).json({ success: false, error: 'Chỉ có thể hủy đơn đang chờ thanh toán' })
    }
    booking.status = 'cancelled'
    booking.cancelledAt = new Date()
    await booking.save()
    await Payment.updateMany({ booking: booking._id, status: { $in: ['pending', 'pending_review'] } }, { status: 'cancelled' })
    await Ticket.updateMany({ booking: booking._id }, { status: 'cancelled' })
    const populated = await populateBooking(Booking.findById(booking._id))
    res.json({ success: true, message: 'Đã hủy vé', data: addLegacyFields(populated) })
  } catch (err) {
    console.error('Cancel booking error:', err)
    res.status(500).json({ success: false, error: 'Lỗi hủy vé', details: err.message })
  }
})

router.patch('/admin/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {}
    const allowedStatuses = ['pending', 'paid', 'expired', 'cancelled', 'refunded']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' })
    }
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })
    if (status === 'paid') {
      return res.status(400).json({ success: false, error: 'Không xác nhận thanh toán thủ công. Trạng thái đã thanh toán chỉ được cập nhật từ PayOS.' })
    }
    booking.status = status
    if (status === 'cancelled') booking.cancelledAt = new Date()
    if (status === 'refunded') booking.refundedAt = new Date()
    await booking.save()
    await Ticket.updateMany({ booking: booking._id }, { status })
    const populated = await populateBooking(Booking.findById(booking._id))
    res.json({ success: true, message: 'Đã cập nhật trạng thái vé', data: addLegacyFields(populated) })
  } catch (err) {
    console.error('Update booking status error:', err)
    res.status(500).json({ success: false, error: 'Lỗi cập nhật trạng thái vé', details: err.message })
  }
})

router.post('/staff/check-in', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const { ticketCode, qrPayload, qrToken } = req.body || {}
    const code = parseTicketCode(ticketCode) || parseTicketCode(qrToken) || parseTicketCode(qrPayload)
    if (!code) return res.status(400).json({ success: false, error: 'Thiếu mã vé' })

    const ticket = await Ticket.findOne({ code })
      .populate('booking')
      .populate('place', 'name address')
      .populate('user', 'username email parentName phone')
    if (!ticket) return res.status(404).json({ success: false, error: 'Không tìm thấy vé' })
    if (ticket.status === 'used') return res.status(409).json({ success: false, error: 'Vé đã được check-in trước đó', data: ticket })
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
    console.error('Check-in ticket error:', err)
    res.status(500).json({ success: false, error: 'Lỗi check-in vé', details: err.message })
  }
})

router.post('/admin/ticket-types', authenticate, requireAdmin, async (req, res) => {
  try {
    const ticketType = await TicketType.create(req.body || {})
    res.status(201).json({ success: true, data: ticketType })
  } catch (err) {
    console.error('Create ticket type error:', err)
    res.status(400).json({ success: false, error: err.message || 'Lỗi tạo loại vé' })
  }
})

module.exports = router
