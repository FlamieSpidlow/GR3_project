const crypto = require('crypto')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const PaymentLog = require('../models/PaymentLog')
const Place = require('../models/Place')
const Ticket = require('../models/Ticket')
const TicketType = require('../models/TicketType')
const { createUserNotification } = require('./notificationService')

const BOOKING_TTL_MINUTES = Number.parseInt(process.env.BOOKING_TTL_MINUTES || '15', 10)

const removeVietnameseAccents = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')

const parsePriceToken = (token) => {
  const raw = String(token || '').trim()
  if (!raw) return null
  const hasK = /k/i.test(raw)
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  let value = Number.parseInt(digits, 10)
  if (!Number.isFinite(value)) return null
  if (hasK || (value > 0 && value < 1000 && !/[.,]/.test(raw))) value *= 1000
  return value
}

const parsePriceValue = (value) => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0
  const normalized = removeVietnameseAccents(value).toLowerCase().trim()
  if (!normalized || normalized.includes('mien phi') || normalized.includes('free')) return 0
  const matches = String(value || '').match(/\d[\d\s.,]*(?:k|K)?/g) || []
  const prices = matches.map(parsePriceToken).filter(n => Number.isFinite(n) && n >= 0)
  return prices.length > 0 ? prices[0] : 0
}

const pad = (value) => String(value).padStart(2, '0')

const vnpayDate = (date = new Date()) => {
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`
}

const sortObject = (obj) => Object.keys(obj).sort().reduce((acc, key) => {
  if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') acc[key] = obj[key]
  return acc
}, {})

const buildQuery = (params, encodeValues = true) => Object.keys(params)
  .map(key => `${encodeURIComponent(key)}=${encodeValues ? encodeURIComponent(params[key]).replace(/%20/g, '+') : params[key]}`)
  .join('&')

const signVnpayParams = (params) => {
  const secret = process.env.VNPAY_HASH_SECRET
  if (!secret) throw new Error('VNPAY_HASH_SECRET is not configured')
  const sorted = sortObject(params)
  const signData = buildQuery(sorted)
  return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex')
}

const verifyVnpayPayload = (payload) => {
  const received = payload.vnp_SecureHash
  if (!received) return false
  const params = { ...payload }
  delete params.vnp_SecureHash
  delete params.vnp_SecureHashType
  return signVnpayParams(params).toLowerCase() === String(received).toLowerCase()
}

const getPublicOrigin = (req) => {
  const configured = process.env.FRONTEND_PUBLIC_ORIGIN || process.env.APP_PUBLIC_ORIGIN
  if (configured) return configured.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return host ? `${proto}://${host}`.replace(/\/$/, '') : ''
}

const createCode = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

const createUniqueCode = async (Model, field, prefix) => {
  for (let i = 0; i < 8; i += 1) {
    const code = createCode(prefix)
    if (!await Model.exists({ [field]: code })) return code
  }
  throw new Error(`Cannot create unique ${field}`)
}

const toQuantity = (value) => {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 50)
}

const normalizeVisitDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

const ensureDefaultTicketTypes = async (place) => {
  let ticketTypes = await TicketType.find({ place: place._id, active: true }).sort({ sortOrder: 1, createdAt: 1 })
  if (ticketTypes.length > 0) return ticketTypes

  const basePrice = parsePriceValue(place.price)
  if (basePrice <= 0) return []

  const created = await TicketType.insertMany([
    {
      place: place._id,
      name: 'Vé người lớn',
      audience: 'adult',
      price: basePrice,
      description: 'Vé tiêu chuẩn cho người lớn',
      sortOrder: 10
    },
    {
      place: place._id,
      name: 'Vé trẻ em',
      audience: 'child',
      price: basePrice,
      description: 'Vé tiêu chuẩn cho trẻ em',
      sortOrder: 20
    }
  ])
  return created
}

const buildBookingItems = async ({ place, items, adultQuantity, childQuantity }) => {
  const ticketTypes = await ensureDefaultTicketTypes(place)
  if (ticketTypes.length === 0) {
    const err = new Error('Địa điểm miễn phí hoặc chưa có loại vé để đặt')
    err.statusCode = 400
    throw err
  }

  const byId = new Map(ticketTypes.map(t => [String(t._id), t]))
  const byAudience = new Map(ticketTypes.map(t => [t.audience, t]))
  const requested = []

  if (Array.isArray(items) && items.length > 0) {
    items.forEach(item => {
      const quantity = toQuantity(item.quantity)
      if (quantity > 0) requested.push({ ticketType: String(item.ticketType || item.ticketTypeId || ''), quantity })
    })
  } else {
    const adult = toQuantity(adultQuantity)
    const child = toQuantity(childQuantity)
    if (adult > 0 && byAudience.get('adult')) requested.push({ ticketType: String(byAudience.get('adult')._id), quantity: adult })
    if (child > 0 && byAudience.get('child')) requested.push({ ticketType: String(byAudience.get('child')._id), quantity: child })
    if (requested.length === 0 && adult + child > 0 && byAudience.get('general')) {
      requested.push({ ticketType: String(byAudience.get('general')._id), quantity: adult + child })
    }
  }

  const bookingItems = requested.map(item => {
    const ticketType = byId.get(String(item.ticketType))
    if (!ticketType) {
      const err = new Error('Loại vé không hợp lệ')
      err.statusCode = 400
      throw err
    }
    if (!ticketType.active) {
      const err = new Error('Loại vé đã ngừng bán')
      err.statusCode = 400
      throw err
    }
    if (item.quantity > ticketType.maxPerBooking) {
      const err = new Error(`Số lượng ${ticketType.name} vượt quá giới hạn`)
      err.statusCode = 400
      throw err
    }
    return {
      ticketType: ticketType._id,
      name: ticketType.name,
      audience: ticketType.audience,
      quantity: item.quantity,
      unitPrice: ticketType.price,
      lineTotal: ticketType.price * item.quantity
    }
  })

  const totalQuantity = bookingItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = bookingItems.reduce((sum, item) => sum + item.lineTotal, 0)
  if (totalQuantity <= 0) {
    const err = new Error('Vui lòng chọn ít nhất 1 vé')
    err.statusCode = 400
    throw err
  }
  return { bookingItems, totalQuantity, totalAmount }
}

const buildVnpayPayUrl = ({ payment, req }) => {
  const tmnCode = process.env.VNPAY_TMN_CODE
  const payUrl = process.env.VNPAY_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
  if (!tmnCode || !process.env.VNPAY_HASH_SECRET) return ''

  const origin = getPublicOrigin(req)
  const returnUrl = `${origin}/api/tickets/vnpay/return`
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1'
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: payment.amount * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: payment.orderRef,
    vnp_OrderInfo: `Thanh toan TheWeekend ${payment.orderRef}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: Array.isArray(ip) ? ip[0] : String(ip).split(',')[0],
    vnp_CreateDate: vnpayDate(new Date()),
    vnp_ExpireDate: vnpayDate(payment.expiresAt)
  }
  params.vnp_SecureHash = signVnpayParams(params)
  return `${payUrl}?${buildQuery(sortObject(params))}`
}

const buildVietQr = (payment) => {
  const bank = process.env.VIETQR_BANK_ID
  const account = process.env.VIETQR_ACCOUNT_NO
  const template = process.env.VIETQR_TEMPLATE || 'compact2'
  const accountName = process.env.VIETQR_ACCOUNT_NAME || ''
  if (!bank || !account) return { qrUrl: '', transferContent: payment.orderRef }
  const content = payment.orderRef
  const params = new URLSearchParams({
    amount: String(payment.amount),
    addInfo: content
  })
  if (accountName) params.set('accountName', accountName)
  return {
    qrUrl: `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(account)}-${encodeURIComponent(template)}.png?${params.toString()}`,
    transferContent: content
  }
}

const isPaymentSuccessful = (payment) => ['success', 'paid'].includes(payment?.status)

const expirePendingBooking = async (booking, payment) => {
  if (!booking || booking.status !== 'pending' || !booking.expiresAt || booking.expiresAt > new Date()) return false
  booking.status = 'expired'
  await booking.save()
  if (payment && ['pending', 'pending_review'].includes(payment.status)) {
    payment.status = 'expired'
    await payment.save()
  }
  return true
}

const assertBookingPayable = async (booking, payment, provider) => {
  if (!booking) {
    const err = new Error('Booking not found')
    err.statusCode = 404
    throw err
  }

  await expirePendingBooking(booking, payment)
  if (booking.status !== 'pending') {
    const err = new Error(`Booking is not payable in status ${booking.status}`)
    err.statusCode = 400
    throw err
  }

  if (payment && provider && payment.provider !== provider) {
    const err = new Error('Payment provider mismatch')
    err.statusCode = 400
    throw err
  }

  if (payment && !['pending', 'pending_review'].includes(payment.status) && !isPaymentSuccessful(payment)) {
    const err = new Error(`Payment is not payable in status ${payment.status}`)
    err.statusCode = 400
    throw err
  }
}

const populateBooking = (query) => query
  .populate('place', 'name address price images')
  .populate('user', 'username email parentName phone')
  .populate('payment')
  .populate('items.ticketType')

const createBooking = async ({ user, payload, req }) => {
  const { placeId, visitDate, note = '', paymentMethod = 'vietqr' } = payload || {}
  if (!placeId) {
    const err = new Error('Thiếu địa điểm')
    err.statusCode = 400
    throw err
  }
  const place = await Place.findById(placeId)
  if (!place) {
    const err = new Error('Không tìm thấy địa điểm')
    err.statusCode = 404
    throw err
  }
  const visitDay = normalizeVisitDate(visitDate)
  if (!visitDay) {
    const err = new Error('Ngày đi không hợp lệ')
    err.statusCode = 400
    throw err
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (visitDay < today) {
    const err = new Error('Ngày đi không được ở quá khứ')
    err.statusCode = 400
    throw err
  }
  const method = paymentMethod === 'vnpay' ? 'vnpay' : 'vietqr'
  if (method === 'vnpay' && (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET)) {
    const err = new Error('VNPAY chưa được cấu hình')
    err.statusCode = 400
    throw err
  }
  const { bookingItems, totalQuantity, totalAmount } = await buildBookingItems({
    place,
    items: payload.items,
    adultQuantity: payload.adultQuantity,
    childQuantity: payload.childQuantity
  })
  if (totalAmount <= 0) {
    const err = new Error('Tổng tiền vé phải lớn hơn 0')
    err.statusCode = 400
    throw err
  }

  const expiresAt = new Date(Date.now() + BOOKING_TTL_MINUTES * 60 * 1000)
  const booking = await Booking.create({
    code: await createUniqueCode(Booking, 'code', 'TWBOOK'),
    user: user._id,
    place: place._id,
    visitDate: visitDay,
    items: bookingItems,
    totalQuantity,
    totalAmount,
    note: String(note || '').trim().slice(0, 500),
    expiresAt
  })

  const payment = await Payment.create({
    booking: booking._id,
    user: user._id,
    provider: method,
    status: method === 'vietqr' ? 'pending_review' : 'pending',
    amount: booking.totalAmount,
    orderRef: await createUniqueCode(Payment, 'orderRef', 'TWPAY'),
    expiresAt,
    rawRequest: { placeId, visitDate, items: payload.items, adultQuantity: payload.adultQuantity, childQuantity: payload.childQuantity }
  })

  if (method === 'vnpay') {
    payment.payUrl = buildVnpayPayUrl({ payment, req })
  } else {
    const vietQr = buildVietQr(payment)
    payment.qrUrl = vietQr.qrUrl
    payment.transferContent = vietQr.transferContent
  }
  await payment.save()
  booking.payment = payment._id
  await booking.save()
  await logPaymentEvent({
    payment,
    booking,
    provider: method,
    event: 'create',
    idempotencyKey: `${method}:create:${payment.orderRef}`,
    valid: true,
    message: method === 'vietqr' ? 'VietQR created, waiting for confirmation' : 'VNPAY payment created',
    payload: payment.rawRequest,
    actor: user
  })

  return populateBooking(Booking.findById(booking._id))
}

const logPaymentEvent = async ({ payment, booking, provider, event, idempotencyKey, valid, duplicate = false, message = '', payload, actor }) => {
  try {
    return await PaymentLog.create({
      payment: payment?._id,
      booking: booking?._id,
      provider,
      event,
      idempotencyKey,
      valid,
      duplicate,
      message,
      payload,
      actor: actor?._id || actor
    })
  } catch (err) {
    if (err && err.code === 11000) return null
    throw err
  }
}

const generateTicketsForBooking = async (booking) => {
  const existing = await Ticket.countDocuments({ booking: booking._id })
  if (existing >= booking.totalQuantity) return Ticket.find({ booking: booking._id }).sort({ lineIndex: 1 })

  const tickets = []
  let lineIndex = 0
  for (let itemIndex = 0; itemIndex < booking.items.length; itemIndex += 1) {
    const item = booking.items[itemIndex]
    for (let q = 0; q < item.quantity; q += 1) {
      const code = await createUniqueCode(Ticket, 'code', 'TWTICKET')
      const qrPayload = JSON.stringify({
        type: 'theweekend-ticket',
        ticketCode: code,
        bookingCode: booking.code
      })
      const ticket = await Ticket.findOneAndUpdate(
        { booking: booking._id, lineIndex },
        {
          $setOnInsert: {
            code,
            booking: booking._id,
            ticketType: item.ticketType,
            user: booking.user,
            place: booking.place,
            visitDate: booking.visitDate,
            name: item.name,
            lineIndex,
            itemIndex,
            status: 'valid',
            qrPayload
          }
        },
        { upsert: true, new: true }
      )
      tickets.push(ticket)
      lineIndex += 1
    }
  }
  return tickets
}

const markPaymentPaid = async ({ payment, payload, providerTransactionId, idempotencyKey, actor, provider }) => {
  const booking = await Booking.findById(payment.booking)
  if (!booking) throw new Error('Booking not found')
  const duplicate = isPaymentSuccessful(payment) || booking.status === 'paid'
  await logPaymentEvent({
    payment,
    booking,
    provider,
    event: 'payment_verified',
    idempotencyKey,
    valid: true,
    duplicate,
    message: duplicate ? 'Duplicate paid callback ignored' : 'Payment verified',
    payload,
    actor
  })
  if (duplicate) return populateBooking(Booking.findById(booking._id))
  await assertBookingPayable(booking, payment, provider)

  if (payment.amount !== booking.totalAmount) {
    payment.status = 'failed'
    payment.failureReason = 'Amount mismatch'
    payment.rawVerifiedPayload = payload
    await payment.save()
    await logPaymentEvent({
      payment,
      booking,
      provider,
      event: 'payment_rejected',
      idempotencyKey: `${idempotencyKey}:amount-mismatch`,
      valid: false,
      message: 'Amount mismatch',
      payload,
      actor
    })
    const err = new Error('Số tiền thanh toán không khớp')
    err.statusCode = 400
    throw err
  }

  payment.status = 'success'
  payment.providerTransactionId = providerTransactionId || payment.providerTransactionId
  payment.rawVerifiedPayload = payload
  payment.paidAt = payment.paidAt || new Date()
  if (actor) {
    payment.confirmedBy = actor._id || actor
    payment.confirmedAt = payment.confirmedAt || new Date()
  }
  await payment.save()

  booking.status = 'paid'
  booking.paidAt = booking.paidAt || payment.paidAt
  await booking.save()
  await generateTicketsForBooking(booking)

  await createUserNotification(booking.user, {
    type: 'success',
    title: 'Đặt vé thành công',
    message: `Thanh toán đơn ${booking.code} đã được xác nhận. Vé điện tử đã sẵn sàng trong mục Vé của tôi.`
  })

  return populateBooking(Booking.findById(booking._id))
}

const handleVnpayPayload = async (payload, source = 'return') => {
  const orderRef = payload.vnp_TxnRef
  const payment = await Payment.findOne({ orderRef, provider: 'vnpay' })
  const idempotencyKey = `vnpay:${source}:${orderRef}:${payload.vnp_TransactionNo || payload.vnp_BankTranNo || payload.vnp_ResponseCode || 'unknown'}`
  if (!payment) {
    await logPaymentEvent({ provider: 'vnpay', event: source, idempotencyKey, valid: false, message: 'Payment not found', payload })
    return { success: false, code: '01', message: 'Payment not found' }
  }
  const booking = await Booking.findById(payment.booking)
  await expirePendingBooking(booking, payment)
  const validHash = verifyVnpayPayload(payload)
  if (!validHash) {
    await logPaymentEvent({ payment, booking, provider: 'vnpay', event: source, idempotencyKey, valid: false, message: 'Invalid signature', payload })
    return { success: false, code: '97', message: 'Invalid signature', booking }
  }
  const amount = Number(payload.vnp_Amount || 0) / 100
  if (amount !== payment.amount) {
    await logPaymentEvent({ payment, booking, provider: 'vnpay', event: source, idempotencyKey, valid: false, message: 'Amount mismatch', payload })
    return { success: false, code: '04', message: 'Amount mismatch', booking }
  }
  if (payload.vnp_ResponseCode !== '00' || payload.vnp_TransactionStatus !== '00') {
    if (isPaymentSuccessful(payment) || booking?.status === 'paid') {
      await logPaymentEvent({ payment, booking, provider: 'vnpay', event: source, idempotencyKey, valid: true, duplicate: true, message: 'Duplicate failed callback ignored after success', payload })
      return { success: true, code: '00', message: 'Already confirmed', booking }
    }
    payment.status = 'failed'
    payment.failureReason = `VNPAY response ${payload.vnp_ResponseCode || ''}/${payload.vnp_TransactionStatus || ''}`
    payment.rawVerifiedPayload = payload
    await payment.save()
    await logPaymentEvent({ payment, booking, provider: 'vnpay', event: source, idempotencyKey, valid: true, message: payment.failureReason, payload })
    return { success: false, code: '00', message: 'Payment failed', booking }
  }
  const populated = await markPaymentPaid({
    payment,
    payload,
    providerTransactionId: payload.vnp_TransactionNo || payload.vnp_BankTranNo,
    idempotencyKey,
    provider: 'vnpay'
  })
  return { success: true, code: '00', message: 'Confirm success', booking: populated }
}

const confirmVietQr = async ({ orderRef, amount, transactionId, payload, actor, source = 'webhook' }) => {
  const payment = await Payment.findOne({ orderRef, provider: 'vietqr' })
  const idempotencyKey = `vietqr:${source}:${transactionId || orderRef}:${amount}`
  if (!payment) {
    await logPaymentEvent({ provider: 'vietqr', event: source, idempotencyKey, valid: false, message: 'Payment not found', payload, actor })
    const err = new Error('Không tìm thấy giao dịch VietQR')
    err.statusCode = 404
    throw err
  }
  const booking = await Booking.findById(payment.booking)
  if (!isPaymentSuccessful(payment) && booking?.status !== 'paid') {
    await assertBookingPayable(booking, payment, 'vietqr')
  }
  if (Number(amount) !== payment.amount) {
    await logPaymentEvent({ payment, booking, provider: 'vietqr', event: source, idempotencyKey, valid: false, message: 'Amount mismatch', payload, actor })
    const err = new Error('Số tiền VietQR không khớp')
    err.statusCode = 400
    throw err
  }
  return markPaymentPaid({
    payment,
    payload,
    providerTransactionId: transactionId,
    idempotencyKey,
    actor,
    provider: 'vietqr'
  })
}

const rejectVietQr = async ({ orderRef, reason = '', payload, actor }) => {
  const payment = await Payment.findOne({ orderRef, provider: 'vietqr' })
  const idempotencyKey = `vietqr:admin-reject:${orderRef}:${Date.now()}`
  if (!payment) {
    await logPaymentEvent({ provider: 'vietqr', event: 'manual_reject', idempotencyKey, valid: false, message: 'Payment not found', payload, actor })
    const err = new Error('Khong tim thay giao dich VietQR')
    err.statusCode = 404
    throw err
  }

  const booking = await Booking.findById(payment.booking)
  if (isPaymentSuccessful(payment) || booking?.status === 'paid') {
    await logPaymentEvent({ payment, booking, provider: 'admin', event: 'manual_reject', idempotencyKey, valid: false, duplicate: true, message: 'Cannot reject successful payment', payload, actor })
    const err = new Error('Khong the tu choi giao dich da thanh cong')
    err.statusCode = 400
    throw err
  }

  payment.status = 'failed'
  payment.failureReason = String(reason || 'Admin rejected VietQR payment').slice(0, 500)
  payment.confirmedBy = actor?._id || actor
  payment.confirmedAt = new Date()
  await payment.save()

  await logPaymentEvent({
    payment,
    booking,
    provider: 'admin',
    event: 'manual_reject',
    idempotencyKey,
    valid: true,
    message: payment.failureReason,
    payload,
    actor
  })

  return populateBooking(Booking.findById(booking._id))
}

module.exports = {
  BOOKING_TTL_MINUTES,
  buildVnpayPayUrl,
  buildVietQr,
  createBooking,
  confirmVietQr,
  rejectVietQr,
  ensureDefaultTicketTypes,
  getPublicOrigin,
  handleVnpayPayload,
  parsePriceValue,
  populateBooking,
  verifyVnpayPayload
}
