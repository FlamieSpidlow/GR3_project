const crypto = require('crypto')
const express = require('express')
const router = express.Router()
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const { authenticate } = require('../middleware/auth')
const {
  buildVietQr,
  buildVnpayPayUrl,
  createUniqueZalopayOrderRef,
  createUniquePayosOrderRef,
  createPayosPayment,
  createZalopayPayment,
  handlePayosWebhook,
  handleZalopayCallback,
  handleVnpayPayload,
  confirmVietQr,
  extractPaymentOrderRef,
  verifySepayWebhookRequest
} = require('../services/ticketingService')

const createOrderRef = () => `TWPAY${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`

const getUniqueOrderRef = async () => {
  for (let i = 0; i < 8; i += 1) {
    const orderRef = createOrderRef()
    if (!await Payment.exists({ orderRef })) return orderRef
  }
  throw new Error('Cannot create payment code')
}

const assertOwnedPendingBooking = async (bookingId, userId) => {
  const booking = await Booking.findOne({ _id: bookingId, user: userId })
  if (!booking) {
    const err = new Error('Không tìm thấy booking')
    err.statusCode = 404
    throw err
  }
  if (booking.status !== 'pending') {
    const err = new Error(`Không thể thanh toán booking ở trạng thái ${booking.status}`)
    err.statusCode = 400
    throw err
  }
  if (booking.expiresAt <= new Date()) {
    booking.status = 'expired'
    await booking.save()
    await Payment.updateOne({ booking: booking._id, status: { $in: ['pending', 'pending_review'] } }, { status: 'expired' })
    const err = new Error('Booking đã hết hạn')
    err.statusCode = 400
    throw err
  }
  return booking
}

const preparePayment = async ({ bookingId, user, provider, req }) => {
  const booking = await assertOwnedPendingBooking(bookingId, user._id)
  let payment = await Payment.findOne({ booking: booking._id })
  if (!payment) {
    payment = new Payment({
      booking: booking._id,
      user: user._id,
      provider,
      amount: booking.totalAmount,
      orderRef: provider === 'payos' ? await createUniquePayosOrderRef() : provider === 'zalopay' ? await createUniqueZalopayOrderRef() : await getUniqueOrderRef(),
      expiresAt: booking.expiresAt
    })
  }

  if (payment.amount !== booking.totalAmount) {
    const err = new Error('Số tiền payment không khớp booking')
    err.statusCode = 400
    throw err
  }

  payment.provider = provider
  if (provider === 'payos' && !/^\d+$/.test(String(payment.orderRef || ''))) {
    payment.orderRef = await createUniquePayosOrderRef()
  }
  if (provider === 'zalopay' && !/^\d{6}/.test(String(payment.orderRef || ''))) {
    payment.orderRef = await createUniqueZalopayOrderRef()
  }
  payment.status = provider === 'vietqr' ? 'pending_review' : 'pending'
  payment.payUrl = ''
  payment.qrUrl = ''
  payment.transferContent = ''

  if (provider === 'payos') {
    if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
      const err = new Error('payOS chua duoc cau hinh')
      err.statusCode = 400
      throw err
    }
    const payos = await createPayosPayment({ payment, booking, req })
    payment.payUrl = payos.payUrl
    payment.qrUrl = payos.qrUrl
    payment.transferContent = payment.orderRef
    payment.rawRequest = { ...payment.rawRequest, payosRequest: payos.rawRequest, payosResponse: payos.rawResponse }
  } else if (provider === 'zalopay') {
    if (!process.env.ZALOPAY_APP_ID || !process.env.ZALOPAY_KEY1 || !process.env.ZALOPAY_KEY2) {
      const err = new Error('ZaloPay chưa được cấu hình')
      err.statusCode = 400
      throw err
    }
    const zalopay = await createZalopayPayment({ payment, booking, req })
    payment.payUrl = zalopay.payUrl
    payment.qrUrl = zalopay.qrUrl
    payment.rawRequest = { ...payment.rawRequest, zalopayRequest: zalopay.rawRequest, zalopayResponse: zalopay.rawResponse }
  } else if (provider === 'vnpay') {
    if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET) {
      const err = new Error('VNPAY chưa được cấu hình')
      err.statusCode = 400
      throw err
    }
    payment.payUrl = buildVnpayPayUrl({ payment, req })
  } else {
    const vietQr = buildVietQr(payment)
    payment.qrUrl = vietQr.qrUrl
    payment.transferContent = vietQr.transferContent
  }

  await payment.save()
  if (!booking.payment) {
    booking.payment = payment._id
    await booking.save()
  }
  return { booking, payment }
}

router.post('/payos/create', authenticate, async (req, res) => {
  try {
    const bookingId = req.body?.bookingId || req.body?.id
    if (!bookingId) return res.status(400).json({ success: false, error: 'Thieu bookingId' })
    const data = await preparePayment({ bookingId, user: req.user, provider: 'payos', req })
    res.json({ success: true, data })
  } catch (err) {
    console.error('Create payOS payment error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Loi tao thanh toan payOS' })
  }
})

router.post('/payos/webhook', async (req, res) => {
  try {
    const result = await handlePayosWebhook(req.body || {})
    res.json({ success: result.success, code: result.code, message: result.message })
  } catch (err) {
    console.error('payOS webhook error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Loi webhook payOS' })
  }
})
router.post('/vnpay/create', authenticate, async (req, res) => {
  try {
    const bookingId = req.body?.bookingId || req.body?.id
    if (!bookingId) return res.status(400).json({ success: false, error: 'Thiếu bookingId' })
    const data = await preparePayment({ bookingId, user: req.user, provider: 'vnpay', req })
    res.json({ success: true, data })
  } catch (err) {
    console.error('Create VNPAY payment error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi tạo thanh toán VNPAY' })
  }
})

router.get('/vnpay/return', async (req, res) => {
  try {
    const result = await handleVnpayPayload(req.query, 'return')
    res.json({ success: result.success, message: result.message, booking: result.booking })
  } catch (err) {
    console.error('VNPAY return error:', err)
    res.status(500).json({ success: false, error: 'Lỗi xử lý VNPAY return' })
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

router.post('/zalopay/create', authenticate, async (req, res) => {
  try {
    const bookingId = req.body?.bookingId || req.body?.id
    if (!bookingId) return res.status(400).json({ success: false, error: 'Thiếu bookingId' })
    const data = await preparePayment({ bookingId, user: req.user, provider: 'zalopay', req })
    res.json({ success: true, data })
  } catch (err) {
    console.error('Create ZaloPay payment error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi tạo thanh toán ZaloPay' })
  }
})

router.post('/zalopay/callback', async (req, res) => {
  try {
    const result = await handleZalopayCallback(req.body || {})
    res.json({ return_code: result.code, return_message: result.message })
  } catch (err) {
    console.error('ZaloPay callback error:', err)
    res.json({ return_code: 2, return_message: err.message || 'ZaloPay callback error' })
  }
})

router.post('/vietqr/create', authenticate, async (req, res) => {
  try {
    const bookingId = req.body?.bookingId || req.body?.id
    if (!bookingId) return res.status(400).json({ success: false, error: 'Thiếu bookingId' })
    const data = await preparePayment({ bookingId, user: req.user, provider: 'vietqr', req })
    res.json({ success: true, data })
  } catch (err) {
    console.error('Create VietQR payment error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi tạo thanh toán VietQR' })
  }
})

router.post('/vietqr/webhook', async (req, res) => {
  try {
    if (!verifySepayWebhookRequest(req)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook secret' })
    }

    const body = req.body || {}
    const orderRef = extractPaymentOrderRef(body.orderRef || body.code || body.content || body.transferContent || body.description)
    const amount = Number(body.amount || body.transferAmount || body.creditAmount)
    const transactionId = body.transactionId || body.reference || body.refNo || ''
    if (!orderRef || !Number.isFinite(amount)) return res.status(400).json({ success: false, error: 'Invalid VietQR payload' })

    const booking = await confirmVietQr({ orderRef, amount, transactionId, payload: body, source: 'webhook' })
    res.json({ success: true, data: booking })
  } catch (err) {
    console.error('VietQR webhook error:', err)
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Lỗi webhook VietQR' })
  }
})

module.exports = router
