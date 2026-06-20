const express = require('express')
const router = express.Router()
const TicketOrder = require('../models/TicketOrder')
const Place = require('../models/Place')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { createUserNotification } = require('../services/notificationService')

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

  if (hasK || (value > 0 && value < 1000 && !/[.,]/.test(raw))) {
    value *= 1000
  }

  return value
}

const parsePriceValue = (value) => {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0

  const normalized = removeVietnameseAccents(value).toLowerCase().trim()
  if (!normalized || normalized.includes('mien phi') || normalized.includes('free')) return 0

  const matches = String(value || '').match(/\d[\d\s.,]*(?:k|K)?/g) || []
  const prices = matches
    .map(parsePriceToken)
    .filter(n => Number.isFinite(n) && n >= 0)

  return prices.length > 0 ? prices[0] : 0
}

const toQuantity = (value) => {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, 50)
}

const generateTicketCode = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `TW-${stamp}-${random}`
}

const generatePaymentToken = () => {
  const randomA = Math.random().toString(36).slice(2)
  const randomB = Math.random().toString(36).slice(2)
  return `${Date.now().toString(36)}-${randomA}${randomB}`.slice(0, 48)
}

const populateOrder = (query) => query
  .populate('place', 'name address price images')
  .populate('user', 'username email parentName')
  .populate('confirmedBy', 'username parentName')

const statusNotification = (status, order) => {
  const placeName = order.place && order.place.name ? order.place.name : 'địa điểm'
  if (status === 'confirmed') {
    return {
      type: 'success',
      title: 'Vé đã được xác nhận',
      message: `Đơn vé tại ${placeName} đã được xác nhận. Mã vé của bạn: ${order.ticketCode || 'đang cập nhật'}.`
    }
  }
  if (status === 'cancelled') {
    return { type: 'warning', title: 'Vé đã bị hủy', message: `Đơn vé tại ${placeName} đã bị hủy.` }
  }
  if (status === 'used') {
    return { type: 'info', title: 'Vé đã sử dụng', message: `Vé tại ${placeName} đã được đánh dấu là đã sử dụng.` }
  }
  if (status === 'pending') {
    return { type: 'info', title: 'Vé đang chờ xác nhận', message: `Đơn vé tại ${placeName} đã thanh toán và đang chờ quản trị viên xác nhận.` }
  }
  return null
}

const getPublicOrigin = (req) => {
  const configured = process.env.FRONTEND_PUBLIC_ORIGIN || process.env.APP_PUBLIC_ORIGIN
  if (configured) return configured.replace(/\/$/, '')

  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (host) return `${proto}://${host}`.replace(/\/$/, '')

  return ''
}

router.get('/payment-origin', (req, res) => {
  const origin = getPublicOrigin(req)
  if (!origin) {
    return res.status(500).json({ success: false, error: 'Khong the xac dinh dia chi website cong khai' })
  }
  res.json({ success: true, origin })
})

router.post('/', authenticate, async (req, res) => {
  try {
    const { placeId, visitDate, adultQuantity, childQuantity, note = '' } = req.body || {}
    if (!placeId) return res.status(400).json({ success: false, error: 'Thiếu địa điểm' })
    if (!visitDate) return res.status(400).json({ success: false, error: 'Thiếu ngày đi' })

    const place = await Place.findById(placeId)
    if (!place) return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })

    const parsedVisitDate = new Date(visitDate)
    if (Number.isNaN(parsedVisitDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Ngày đi không hợp lệ' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const visitDay = new Date(parsedVisitDate)
    visitDay.setHours(0, 0, 0, 0)
    if (visitDay < today) {
      return res.status(400).json({ success: false, error: 'Ngày đi không được ở quá khứ' })
    }

    const adultQty = toQuantity(adultQuantity)
    const childQty = toQuantity(childQuantity)
    const totalQuantity = adultQty + childQty
    if (totalQuantity <= 0) {
      return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất 1 vé' })
    }

    const unitPrice = parsePriceValue(place.price)
    let paymentToken = generatePaymentToken()
    while (await TicketOrder.exists({ paymentToken })) {
      paymentToken = generatePaymentToken()
    }

    const order = await TicketOrder.create({
      user: req.user._id,
      place: place._id,
      visitDate: visitDay,
      adultQuantity: adultQty,
      childQuantity: childQty,
      unitPrice,
      totalPrice: unitPrice * totalQuantity,
      note: String(note || '').trim().slice(0, 500),
      status: 'unpaid',
      paymentStatus: 'unpaid',
      paymentToken
    })

    const populated = await populateOrder(TicketOrder.findById(order._id))
    await createUserNotification(req.user._id, {
      type: 'info',
      title: 'Đã tạo đơn vé',
      message: `Đơn vé tại ${place.name} đã được tạo. Vui lòng thanh toán để chờ xác nhận.`
    })
    res.status(201).json({ success: true, message: 'Đã gửi yêu cầu đặt vé', data: populated })
  } catch (err) {
    console.error('Create ticket order error:', err)
    res.status(500).json({ success: false, error: 'Lỗi đặt vé', details: err.message })
  }
})

router.post('/:id/simulate-payment', authenticate, async (req, res) => {
  try {
    const order = await TicketOrder.findOne({ _id: req.params.id, user: req.user._id })
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Đơn vé đã hủy, không thể thanh toán' })
    }
    if (order.status === 'used') {
      return res.status(400).json({ success: false, error: 'Vé đã sử dụng' })
    }

    order.paymentStatus = 'paid'
    order.paidAt = order.paidAt || new Date()
    if (order.status === 'unpaid') {
      order.status = 'pending'
    }

    await order.save()
    const populated = await populateOrder(TicketOrder.findById(order._id))
    await createUserNotification(order.user, {
      type: 'success',
      title: 'Thanh toán thành công',
      message: `Đơn vé tại ${populated.place?.name || 'địa điểm'} đã thanh toán và đang chờ xác nhận.`
    })
    res.json({ success: true, message: 'Thanh toán thành công, vé đang chờ xác nhận', data: populated })
  } catch (err) {
    console.error('Simulate ticket payment error:', err)
    res.status(500).json({ success: false, error: 'Lỗi thanh toán giả lập', details: err.message })
  }
})

router.post('/:id/simulate-payment/scan', async (req, res) => {
  try {
    const { token = '' } = req.body || {}
    const order = await TicketOrder.findOne({ _id: req.params.id, paymentToken: String(token || '') })
    if (!order) return res.status(404).json({ success: false, error: 'Mã QR không hợp lệ hoặc đã hết hạn' })

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Đơn vé đã hủy, không thể thanh toán' })
    }
    if (order.status === 'used') {
      return res.status(400).json({ success: false, error: 'Vé đã sử dụng' })
    }

    order.paymentStatus = 'paid'
    order.paidAt = order.paidAt || new Date()
    if (order.status === 'unpaid') {
      order.status = 'pending'
    }

    await order.save()
    const populated = await populateOrder(TicketOrder.findById(order._id))
    await createUserNotification(order.user, {
      type: 'success',
      title: 'Thanh toán thành công',
      message: `Đơn vé tại ${populated.place?.name || 'địa điểm'} đã thanh toán và đang chờ xác nhận.`
    })
    res.json({ success: true, message: 'Thanh toán thành công, vé đang chờ xác nhận', data: populated })
  } catch (err) {
    console.error('Scan ticket payment error:', err)
    res.status(500).json({ success: false, error: 'Lỗi thanh toán bằng QR', details: err.message })
  }
})

router.get('/:id/payment-status', authenticate, async (req, res) => {
  try {
    const order = await populateOrder(
      TicketOrder.findOne({ _id: req.params.id, user: req.user._id })
    )
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })

    res.json({
      success: true,
      data: order,
      paymentStatus: order.paymentStatus,
      status: order.status,
      paidAt: order.paidAt
    })
  } catch (err) {
    console.error('Get ticket payment status error:', err)
    res.status(500).json({ success: false, error: 'Lỗi kiểm tra trạng thái thanh toán', details: err.message })
  }
})

router.get('/my', authenticate, async (req, res) => {
  try {
    const orders = await populateOrder(
      TicketOrder.find({ user: req.user._id }).sort({ createdAt: -1 })
    )
    res.json({ success: true, data: orders })
  } catch (err) {
    console.error('Get my ticket orders error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách vé', details: err.message })
  }
})

router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status = '', limit = 200 } = req.query
    const query = {}
    if (status) query.status = status

    const orders = await populateOrder(
      TicketOrder.find(query)
        .sort({ createdAt: -1 })
        .limit(Math.min(Number.parseInt(limit, 10) || 200, 500))
    )

    res.json({ success: true, data: orders })
  } catch (err) {
    console.error('Get admin ticket orders error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách đơn vé', details: err.message })
  }
})

router.patch('/admin/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {}
    const allowedStatuses = ['unpaid', 'pending', 'confirmed', 'cancelled', 'used']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' })
    }

    const order = await TicketOrder.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn vé' })

    if (order.status === 'used' && status !== 'used') {
      return res.status(400).json({ success: false, error: 'Vé đã sử dụng không thể đổi trạng thái' })
    }
    if (status === 'confirmed' && order.status === 'unpaid') {
      return res.status(400).json({ success: false, error: 'Chỉ có thể xác nhận vé đã thanh toán' })
    }
    if (status === 'used' && order.status !== 'confirmed') {
      return res.status(400).json({ success: false, error: 'Chỉ có thể sử dụng vé đã xác nhận' })
    }

    order.status = status
    if (status === 'confirmed') {
      if (!order.ticketCode) {
        let code = generateTicketCode()
        while (await TicketOrder.exists({ ticketCode: code })) {
          code = generateTicketCode()
        }
        order.ticketCode = code
      }
      order.confirmedBy = req.user._id
      order.confirmedAt = order.confirmedAt || new Date()
      order.paymentStatus = 'paid'
      order.paidAt = order.paidAt || new Date()
      order.cancelledAt = undefined
      order.usedAt = undefined
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date()
    } else if (status === 'unpaid') {
      order.paymentStatus = 'unpaid'
      order.paidAt = undefined
      order.confirmedBy = undefined
      order.confirmedAt = undefined
      order.cancelledAt = undefined
      order.usedAt = undefined
    } else if (status === 'used') {
      order.usedAt = new Date()
    }

    await order.save()
    const populated = await populateOrder(TicketOrder.findById(order._id))
    const notification = statusNotification(status, populated)
    if (notification) {
      await createUserNotification(order.user, notification)
    }
    res.json({ success: true, message: 'Đã cập nhật trạng thái vé', data: populated })
  } catch (err) {
    console.error('Update ticket order status error:', err)
    res.status(500).json({ success: false, error: 'Lỗi cập nhật trạng thái vé', details: err.message })
  }
})

module.exports = router
