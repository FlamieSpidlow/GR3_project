const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const PaymentLog = require('../models/PaymentLog')
const Ticket = require('../models/Ticket')
const TicketType = require('../models/TicketType')
const { authenticate, requireAdmin, requireStaffOrAdmin } = require('../middleware/auth')
const {
  confirmVietQr,
  createBooking,
  ensureDefaultTicketTypes,
  getPublicOrigin,
  handleVnpayPayload,
  populateBooking
} = require('../services/ticketingService')

const statusToLegacyPayment = (status) => status === 'paid' || status === 'used' ? 'paid' : 'unpaid'

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

router.get('/payment-origin', (req, res) => {
  const origin = getPublicOrigin(req)
  if (!origin) {
    return res.status(500).json({ success: false, error: 'Khong the xac dinh dia chi website cong khai' })
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
      message: 'Đã tạo đơn đặt vé. Vui lòng thanh toán để hoàn tất.',
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

router.post('/admin/vietqr/confirm', authenticate, requireAdmin, async (req, res) => {
  try {
    const { orderRef, amount, transactionId = '', payload = {} } = req.body || {}
    if (!orderRef || !Number.isFinite(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Thiếu mã thanh toán hoặc số tiền' })
    }
    const booking = await confirmVietQr({
      orderRef,
      amount: Number(amount),
      transactionId,
      payload: { ...payload, orderRef, amount, transactionId },
      actor: req.user,
      source: 'admin'
    })
    res.json({ success: true, message: 'Đã xác nhận thanh toán VietQR', data: addLegacyFields(booking) })
  } catch (err) {
    console.error('Admin confirm VietQR error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi xác nhận VietQR' })
  }
})

router.post('/vietqr/webhook', async (req, res) => {
  try {
    const secret = process.env.VIETQR_WEBHOOK_SECRET
    if (secret && req.headers['x-webhook-secret'] !== secret) {
      return res.status(401).json({ success: false, error: 'Invalid webhook secret' })
    }
    const body = req.body || {}
    const orderRef = body.orderRef || body.content || body.transferContent || body.description
    const amount = Number(body.amount || body.transferAmount || body.creditAmount)
    const transactionId = body.transactionId || body.reference || body.refNo || ''
    if (!orderRef || !Number.isFinite(amount)) {
      return res.status(400).json({ success: false, error: 'Invalid VietQR payload' })
    }
    const booking = await confirmVietQr({
      orderRef: String(orderRef).trim(),
      amount,
      transactionId: String(transactionId || ''),
      payload: body,
      source: 'webhook'
    })
    res.json({ success: true, data: addLegacyFields(booking) })
  } catch (err) {
    console.error('VietQR webhook error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi webhook VietQR' })
  }
})

router.get('/vnpay/ipn', async (req, res) => {
  try {
    const result = await handleVnpayPayload(req.query, 'ipn')
    res.json({ RspCode: result.code, Message: result.message })
  } catch (err) {
    console.error('VNPAY IPN error:', err)
    res.json({ RspCode: '99', Message: 'Unknown error' })
  }
})

router.get('/vnpay/return', async (req, res) => {
  try {
    const result = await handleVnpayPayload(req.query, 'return')
    const bookingId = result.booking?._id || ''
    const status = result.success ? 'success' : 'failed'
    const origin = getPublicOrigin(req)
    res.redirect(`${origin}/ticket-payment/${bookingId}?provider=vnpay&status=${status}`)
  } catch (err) {
    console.error('VNPAY return error:', err)
    const origin = getPublicOrigin(req)
    res.redirect(`${origin}/tickets?payment=failed`)
  }
})

router.get('/:id/payment-status', authenticate, async (req, res) => {
  try {
    const booking = await populateBooking(
      Booking.findOne({ _id: req.params.id, user: req.user._id })
    )
    if (!booking) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })
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
    await Payment.updateOne({ booking: booking._id, status: 'pending' }, { status: 'cancelled' })
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
    const allowedStatuses = ['pending', 'paid', 'expired', 'cancelled', 'refunded', 'used']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' })
    }
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })
    if (status === 'paid') {
      return res.status(400).json({ success: false, error: 'Không xác nhận paid thủ công ở đây. Dùng đối soát VietQR hoặc VNPAY callback.' })
    }
    booking.status = status
    if (status === 'cancelled') booking.cancelledAt = new Date()
    if (status === 'refunded') booking.refundedAt = new Date()
    if (status === 'used') booking.usedAt = new Date()
    await booking.save()
    await Ticket.updateMany({ booking: booking._id }, { status: status === 'used' ? 'used' : status })
    const populated = await populateBooking(Booking.findById(booking._id))
    res.json({ success: true, message: 'Đã cập nhật trạng thái vé', data: addLegacyFields(populated) })
  } catch (err) {
    console.error('Update booking status error:', err)
    res.status(500).json({ success: false, error: 'Lỗi cập nhật trạng thái vé', details: err.message })
  }
})

router.post('/staff/check-in', authenticate, requireStaffOrAdmin, async (req, res) => {
  try {
    const { ticketCode, qrPayload } = req.body || {}
    let code = ticketCode
    if (!code && qrPayload) {
      try {
        code = JSON.parse(qrPayload).ticketCode
      } catch (_) {
        code = String(qrPayload || '')
      }
    }
    if (!code) return res.status(400).json({ success: false, error: 'Thiếu mã vé' })
    const ticket = await Ticket.findOne({ code })
      .populate('booking')
      .populate('place', 'name address')
      .populate('user', 'username email parentName phone')
    if (!ticket) return res.status(404).json({ success: false, error: 'Không tìm thấy vé' })
    if (ticket.status === 'used') return res.status(409).json({ success: false, error: 'Vé đã được check-in trước đó', data: ticket })
    if (ticket.status !== 'paid') return res.status(400).json({ success: false, error: `Vé không hợp lệ ở trạng thái ${ticket.status}` })
    ticket.status = 'used'
    ticket.usedAt = new Date()
    ticket.checkedInBy = req.user._id
    await ticket.save()
    const remaining = await Ticket.countDocuments({ booking: ticket.booking._id, status: 'paid' })
    if (remaining === 0) {
      await Booking.updateOne({ _id: ticket.booking._id }, { status: 'used', usedAt: new Date() })
    }
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
