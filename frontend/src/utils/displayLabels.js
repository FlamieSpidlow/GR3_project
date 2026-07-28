export const statusLabels = {
  pending: 'Chờ thanh toán',
  pending_review: 'Chờ đối soát',
  processing: 'Chờ xử lý',
  reviewing: 'Chờ đối soát',
  paid: 'Đã thanh toán',
  success: 'Đã thanh toán',
  confirmed: 'Đã thanh toán',
  valid: 'Còn hiệu lực',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  used: 'Đã sử dụng',
  failed: 'Thất bại',
  local: 'Tài khoản thường',
  google: 'Google',
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  user: 'Người dùng'
}

export const statusTones = {
  pending: 'warning',
  pending_review: 'warning',
  processing: 'warning',
  reviewing: 'warning',
  paid: 'success',
  success: 'success',
  confirmed: 'success',
  valid: 'success',
  expired: 'neutral',
  cancelled: 'danger',
  refunded: 'info',
  used: 'info',
  failed: 'danger',
  admin: 'warning',
  staff: 'info',
  user: 'neutral',
  local: 'neutral',
  google: 'info'
}

export function statusLabel(value) {
  return statusLabels[value] || value || 'Chưa có'
}

export function statusTone(value) {
  return statusTones[value] || 'neutral'
}

export function bookingCode(order) {
  return order?.code || order?.bookingCode || friendlyFallback(order?._id, 'TWBOOK')
}

export function ticketCode(ticket) {
  return ticket?.code || ticket?.ticketCode || friendlyFallback(ticket?._id, 'TWTICKET')
}

export function paymentCode(payment) {
  return payment?.orderRef || payment?.code || friendlyFallback(payment?._id, 'TWPAY')
}

export function paymentLabel(payment) {
  if (!payment) return 'Chưa có'
  return paymentCode(payment)
}

export function paymentProviderLabel(provider) {
  const value = String(provider || '').toLowerCase()
  const labels = {
    payos: 'PayOS'
  }
  return labels[value] || 'PayOS'
}

export function friendlyFallback(id, prefix) {
  const value = String(id || '').trim()
  if (!value) return 'Chưa có'
  if (/^(TWBOOK|TWTICKET|TWPAY)[A-Z0-9_-]*/i.test(value)) return value.toUpperCase()
  const tail = value.slice(-8).toUpperCase()
  return tail.length > 4 ? `${prefix}-${tail.slice(0, 4)}-${tail.slice(4)}` : `${prefix}-${tail}`
}
