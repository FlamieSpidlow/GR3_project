const crypto = require('crypto')
const fetch = require('node-fetch')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const PaymentLog = require('../models/PaymentLog')
const Place = require('../models/Place')
const Ticket = require('../models/Ticket')
const TicketType = require('../models/TicketType')
const { sendTicketConfirmationEmail } = require('./emailService')
const { createUserNotification } = require('./notificationService')

const BOOKING_TTL_MINUTES = Number.parseInt(process.env.BOOKING_TTL_MINUTES || '60', 10)

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

const safeCompare = (a, b) => {
  const left = Buffer.from(String(a || ''), 'utf8')
  const right = Buffer.from(String(b || ''), 'utf8')
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

const signPayosData = (data, checksumKey = process.env.PAYOS_CHECKSUM_KEY) => {
  if (!checksumKey) throw new Error('PAYOS_CHECKSUM_KEY is not configured')
  const signData = Object.keys(data || {})
    .filter(key => data[key] !== undefined && data[key] !== null)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&')
  return crypto.createHmac('sha256', checksumKey).update(signData, 'utf8').digest('hex')
}

const verifyPayosWebhook = (payload) => {
  if (!payload?.data || !payload?.signature) return false
  return safeCompare(signPayosData(payload.data), payload.signature)
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

const createPayosOrderCode = () => String((Date.now() % 10000000) * 100 + crypto.randomInt(10, 99))

const createUniquePayosOrderRef = async () => {
  for (let i = 0; i < 8; i += 1) {
    const code = createPayosOrderCode()
    if (!await Payment.exists({ orderRef: code })) return code
  }
  throw new Error('Cannot create unique payOS orderCode')
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

// Lấy giờ đóng cửa (phút tính từ 00:00) từ openingHours dạng "HH:MM - HH:MM".
// Trả null nếu không parse được hoặc mở qua đêm (đóng <= mở) để không chặn oan.
const parseClosingMinutes = (openingHours) => {
  const raw = Array.isArray(openingHours) ? openingHours.find(Boolean) : openingHours
  const match = String(raw || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
  if (!match) return null
  const openMinutes = Number(match[1]) * 60 + Number(match[2])
  const closeMinutes = Number(match[3]) * 60 + Number(match[4])
  if (!Number.isFinite(closeMinutes) || closeMinutes <= openMinutes) return null
  return closeMinutes
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

const createPayosPayment = async ({ payment, booking, req }) => {
  const clientId = process.env.PAYOS_CLIENT_ID
  const apiKey = process.env.PAYOS_API_KEY
  const createUrl = process.env.PAYOS_CREATE_URL || 'https://api-merchant.payos.vn/v2/payment-requests'
  if (!clientId || !apiKey || !process.env.PAYOS_CHECKSUM_KEY) return { payUrl: '', qrUrl: '', rawRequest: null, rawResponse: null }

  const origin = getPublicOrigin(req)
  const orderCode = Number(payment.orderRef)
  const description = String(process.env.PAYOS_DESCRIPTION_PREFIX || `TW${payment.orderRef}`).slice(0, 25)
  const requestBody = {
    orderCode,
    amount: payment.amount,
    description,
    items: (booking.items || []).map(line => ({
      name: String(line.name || 'Vé TheWeekend').slice(0, 100),
      quantity: line.quantity || 1,
      price: line.unitPrice || 0
    })),
    cancelUrl: `${origin}/ticket-payment/${booking._id}?provider=payos&status=cancelled`,
    returnUrl: `${origin}/ticket-payment/${booking._id}?provider=payos&status=success`,
    expiredAt: Math.floor(payment.expiresAt.getTime() / 1000)
  }
  requestBody.signature = signPayosData({
    amount: requestBody.amount,
    cancelUrl: requestBody.cancelUrl,
    description: requestBody.description,
    orderCode: requestBody.orderCode,
    returnUrl: requestBody.returnUrl
  })

  const response = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey
    },
    body: JSON.stringify(requestBody)
  })
  const rawResponse = await response.json().catch(() => ({}))
  if (!response.ok || rawResponse.code !== '00') {
    const err = new Error(rawResponse.desc || 'Không tạo được thanh toán PayOS')
    err.statusCode = 400
    err.details = rawResponse
    throw err
  }
  return {
    payUrl: rawResponse.data?.checkoutUrl || '',
    qrUrl: rawResponse.data?.qrCode || '',
    rawRequest: requestBody,
    rawResponse
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

// Tự động hết hạn các vé chưa dùng mà ngày đi đã qua.
// Chạy khi đọc danh sách vé (lazy expiry) nên không cần job nền.
const expirePastTickets = async (filter = {}) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result = await Ticket.updateMany(
    { ...filter, status: { $in: ['valid', 'paid'] }, visitDate: { $lt: today } },
    { $set: { status: 'expired' } }
  )
  return result?.modifiedCount || 0
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
  const { placeId, visitDate, note = '' } = payload || {}
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
  // Nếu đặt cho hôm nay mà đã quá giờ đóng cửa của địa điểm thì từ chối.
  const closingMinutes = parseClosingMinutes(place.openingHours)
  if (closingMinutes !== null && visitDay.getTime() === today.getTime()) {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (nowMinutes >= closingMinutes) {
      const err = new Error(`Địa điểm đã đóng cửa hôm nay (giờ mở cửa ${String(place.openingHours.find(Boolean) || '').trim()}). Vui lòng chọn ngày khác.`)
      err.statusCode = 400
      throw err
    }
  }
  if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
    const err = new Error('PayOS chưa được cấu hình')
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
    provider: 'payos',
    status: 'pending',
    amount: booking.totalAmount,
    orderRef: await createUniquePayosOrderRef(),
    expiresAt,
    rawRequest: { placeId, visitDate, items: payload.items, adultQuantity: payload.adultQuantity, childQuantity: payload.childQuantity }
  })

  const payos = await createPayosPayment({ payment, booking, req })
  payment.payUrl = payos.payUrl
  payment.qrUrl = payos.qrUrl
  payment.transferContent = payment.orderRef
  payment.rawRequest = { ...payment.rawRequest, payosRequest: payos.rawRequest, payosResponse: payos.rawResponse }
  await payment.save()
  booking.payment = payment._id
  await booking.save()
  await logPaymentEvent({
    payment,
    booking,
    provider: 'payos',
    event: 'create',
    idempotencyKey: `payos:create:${payment.orderRef}`,
    valid: true,
    message: 'PayOS payment created',
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

const markPaymentPaid = async ({ payment, payload, providerTransactionId, idempotencyKey, actor }) => {
  const booking = await Booking.findById(payment.booking)
  if (!booking) throw new Error('Booking not found')
  const duplicate = isPaymentSuccessful(payment) || booking.status === 'paid'
  await logPaymentEvent({
    payment,
    booking,
    provider: 'payos',
    event: 'payment_verified',
    idempotencyKey,
    valid: true,
    duplicate,
    message: duplicate ? 'Duplicate paid callback ignored' : 'Payment verified',
    payload,
    actor
  })
  if (duplicate) return populateBooking(Booking.findById(booking._id))
  await assertBookingPayable(booking, payment, 'payos')

  if (payment.amount !== booking.totalAmount) {
    payment.status = 'failed'
    payment.failureReason = 'Amount mismatch'
    payment.rawVerifiedPayload = payload
    await payment.save()
    await logPaymentEvent({
      payment,
      booking,
      provider: 'payos',
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

  await sendTicketConfirmationEmail(booking._id)

  return populateBooking(Booking.findById(booking._id))
}

const getPayosPaymentInfo = async (orderCode) => {
  const clientId = process.env.PAYOS_CLIENT_ID
  const apiKey = process.env.PAYOS_API_KEY
  if (!clientId || !apiKey) return null
  const response = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${encodeURIComponent(orderCode)}`, {
    headers: {
      'x-client-id': clientId,
      'x-api-key': apiKey
    }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.code !== '00') return null
  return payload.data || null
}

const isPayosLookupPaid = (data) => {
  const statusTokens = [
    data?.status,
    data?.paymentStatus,
    data?.transactions?.[0]?.status
  ].map(value => String(value || '').toUpperCase())
  return statusTokens.some(status => ['PAID', 'SUCCESS', 'SUCCEEDED'].includes(status))
}

const refreshPayosPaymentStatus = async (payment) => {
  if (!payment || payment.provider !== 'payos' || isPaymentSuccessful(payment)) return null
  const data = await getPayosPaymentInfo(payment.orderRef)
  if (!data) return null
  if (!isPayosLookupPaid(data)) return data
  return markPaymentPaid({
    payment,
    payload: { source: 'payos_status_lookup', data },
    providerTransactionId: data.transactions?.[0]?.reference || data.paymentLinkId,
    idempotencyKey: `payos:status:${payment.orderRef}:${data.paymentLinkId || data.status || 'paid'}`
  })
}

const handlePayosWebhook = async (payload) => {
  const data = payload?.data || {}
  const orderRef = String(data.orderCode || '')
  const idempotencyKey = `payos:webhook:${orderRef}:${data.reference || data.paymentLinkId || payload?.code || 'unknown'}`
  if (!verifyPayosWebhook(payload)) {
    await logPaymentEvent({ provider: 'payos', event: 'webhook', idempotencyKey, valid: false, message: 'Invalid signature', payload })
    return { success: false, code: '97', message: 'Invalid signature' }
  }
  if (!payload.success || payload.code !== '00' || data.code !== '00') {
    await logPaymentEvent({ provider: 'payos', event: 'webhook', idempotencyKey, valid: true, message: data.desc || payload.desc || 'payOS event ignored', payload })
    return { success: true, code: '00', message: 'Ignored non-success payOS event' }
  }
  const payment = await Payment.findOne({ orderRef, provider: 'payos' })
  if (!payment) {
    await logPaymentEvent({ provider: 'payos', event: 'webhook', idempotencyKey, valid: false, message: 'Payment not found', payload })
    return { success: false, code: '01', message: 'Payment not found' }
  }
  const amount = Number(data.amount || 0)
  if (amount !== payment.amount) {
    const booking = await Booking.findById(payment.booking)
    await logPaymentEvent({ payment, booking, provider: 'payos', event: 'webhook', idempotencyKey, valid: false, message: 'Amount mismatch', payload })
    return { success: false, code: '04', message: 'Amount mismatch', booking }
  }
  const populated = await markPaymentPaid({
    payment,
    payload,
    providerTransactionId: data.reference || data.paymentLinkId,
    idempotencyKey
  })
  return { success: true, code: '00', message: 'Success', booking: populated }
}

module.exports = {
  BOOKING_TTL_MINUTES,
  createBooking,
  ensureDefaultTicketTypes,
  expirePastTickets,
  getPublicOrigin,
  handlePayosWebhook,
  parsePriceValue,
  populateBooking,
  refreshPayosPaymentStatus,
  createPayosPayment,
  verifyPayosWebhook
}
