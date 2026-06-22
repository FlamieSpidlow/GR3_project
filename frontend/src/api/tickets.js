import { apiUrl } from '../utils/apiBase'
import { getAuthToken } from '../utils/authSession'

const API_URL = apiUrl('/tickets')

const getAuthHeader = () => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const requestJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {})
    }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { success: false, error: data.error || 'Co loi xay ra', status: res.status }
  }
  return data
}

export async function createTicketOrder(payload) {
  try {
    return await requestJson(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    })
  } catch (err) {
    console.error('Create ticket order error:', err)
    return { success: false, error: 'Loi dat ve', details: err.message }
  }
}

export async function createBooking(payload) {
  try {
    return await requestJson(`${API_URL}/bookings`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    })
  } catch (err) {
    console.error('Create booking error:', err)
    return { success: false, error: 'Loi dat ve', details: err.message }
  }
}

export async function getPlaceTicketTypes(placeId) {
  try {
    return await requestJson(`${API_URL}/places/${encodeURIComponent(placeId)}/ticket-types`)
  } catch (err) {
    console.error('Get ticket types error:', err)
    return { success: false, error: 'Loi lay loai ve', details: err.message }
  }
}

export async function getTicketPaymentStatus(orderId) {
  try {
    return await requestJson(`${API_URL}/${encodeURIComponent(orderId)}/payment-status`)
  } catch (err) {
    console.error('Get ticket payment status error:', err)
    return { success: false, error: 'Loi kiem tra thanh toan', details: err.message }
  }
}

export async function getTicketPaymentOrigin() {
  try {
    return await requestJson(`${API_URL}/payment-origin`)
  } catch (err) {
    console.error('Get ticket payment origin error:', err)
    return { success: false, error: 'Loi lay duong dan thanh toan', details: err.message }
  }
}

export async function getMyTicketOrders() {
  try {
    return await requestJson(`${API_URL}/my`)
  } catch (err) {
    console.error('Get my ticket orders error:', err)
    return { success: false, error: 'Loi lay danh sach ve', details: err.message }
  }
}

export async function cancelTicketOrder(orderId) {
  try {
    return await requestJson(`${API_URL}/${encodeURIComponent(orderId)}/cancel`, {
      method: 'PATCH'
    })
  } catch (err) {
    console.error('Cancel ticket order error:', err)
    return { success: false, error: 'Loi huy ve', details: err.message }
  }
}

export async function getAdminTicketOrders(status = '') {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return await requestJson(`${API_URL}/admin${query}`)
  } catch (err) {
    console.error('Get admin ticket orders error:', err)
    return { success: false, error: 'Loi lay danh sach dat ve', details: err.message }
  }
}

export async function updateTicketOrderStatus(orderId, status) {
  try {
    return await requestJson(`${API_URL}/admin/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  } catch (err) {
    console.error('Update ticket order status error:', err)
    return { success: false, error: 'Loi cap nhat trang thai ve', details: err.message }
  }
}

export async function getAdminPayments(filters = {}) {
  try {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.provider) params.set('provider', filters.provider)
    const query = params.toString() ? `?${params.toString()}` : ''
    return await requestJson(`${API_URL}/admin/payments${query}`)
  } catch (err) {
    console.error('Get admin payments error:', err)
    return { success: false, error: 'Loi doi soat thanh toan', details: err.message }
  }
}

export async function getPaymentLogs() {
  try {
    return await requestJson(`${API_URL}/admin/payment-logs`)
  } catch (err) {
    console.error('Get payment logs error:', err)
    return { success: false, error: 'Loi lay log thanh toan', details: err.message }
  }
}

export async function confirmVietQrPayment(payload) {
  try {
    return await requestJson(`${API_URL}/admin/vietqr/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    })
  } catch (err) {
    console.error('Confirm VietQR error:', err)
    return { success: false, error: 'Loi xac nhan VietQR', details: err.message }
  }
}

export async function rejectVietQrPayment(payload) {
  try {
    return await requestJson(`${API_URL}/admin/vietqr/reject`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    })
  } catch (err) {
    console.error('Reject VietQR error:', err)
    return { success: false, error: 'Loi tu choi VietQR', details: err.message }
  }
}

export async function checkInTicket(payload) {
  try {
    return await requestJson(`${API_URL}/staff/check-in`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    })
  } catch (err) {
    console.error('Check-in ticket error:', err)
    return { success: false, error: 'Loi check-in ve', details: err.message }
  }
}
