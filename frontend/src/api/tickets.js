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
    return { success: false, error: data.error || 'Có lỗi xảy ra', status: res.status }
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
    return { success: false, error: 'Lỗi đặt vé', details: err.message }
  }
}

export async function simulateTicketPayment(orderId) {
  try {
    return await requestJson(`${API_URL}/${encodeURIComponent(orderId)}/simulate-payment`, {
      method: 'POST'
    })
  } catch (err) {
    console.error('Simulate ticket payment error:', err)
    return { success: false, error: 'Lỗi thanh toán giả lập', details: err.message }
  }
}

export async function scanTicketPayment(orderId, token) {
  try {
    return await requestJson(`${API_URL}/${encodeURIComponent(orderId)}/simulate-payment/scan`, {
      method: 'POST',
      body: JSON.stringify({ token })
    })
  } catch (err) {
    console.error('Scan ticket payment error:', err)
    return { success: false, error: 'Lỗi thanh toán bằng QR', details: err.message }
  }
}

export async function getTicketPaymentStatus(orderId) {
  try {
    return await requestJson(`${API_URL}/${encodeURIComponent(orderId)}/payment-status`)
  } catch (err) {
    console.error('Get ticket payment status error:', err)
    return { success: false, error: 'Lỗi kiểm tra trạng thái thanh toán', details: err.message }
  }
}

export async function getTicketPaymentOrigin() {
  try {
    return await requestJson(`${API_URL}/payment-origin`)
  } catch (err) {
    console.error('Get ticket payment origin error:', err)
    return { success: false, error: 'Lỗi lấy đường dẫn thanh toán', details: err.message }
  }
}

export async function getMyTicketOrders() {
  try {
    return await requestJson(`${API_URL}/my`)
  } catch (err) {
    console.error('Get my ticket orders error:', err)
    return { success: false, error: 'Lỗi lấy danh sách vé', details: err.message }
  }
}

export async function getAdminTicketOrders(status = '') {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return await requestJson(`${API_URL}/admin${query}`)
  } catch (err) {
    console.error('Get admin ticket orders error:', err)
    return { success: false, error: 'Lỗi lấy danh sách đơn vé', details: err.message }
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
    return { success: false, error: 'Lỗi cập nhật trạng thái vé', details: err.message }
  }
}
