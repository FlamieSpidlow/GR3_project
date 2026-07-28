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

export async function getTicketPaymentStatus(orderId) {
  try {
    return await requestJson(`${API_URL}/${encodeURIComponent(orderId)}/payment-status`)
  } catch (err) {
    console.error('Get ticket payment status error:', err)
    return { success: false, error: 'Lỗi kiểm tra thanh toán', details: err.message }
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

export async function cancelTicketOrder(orderId) {
  try {
    return await requestJson(`${API_URL}/${encodeURIComponent(orderId)}/cancel`, {
      method: 'PATCH'
    })
  } catch (err) {
    console.error('Cancel ticket order error:', err)
    return { success: false, error: 'Lỗi hủy vé', details: err.message }
  }
}

export async function getAdminTicketOrders(status = '') {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return await requestJson(`${API_URL}/admin${query}`)
  } catch (err) {
    console.error('Get admin ticket orders error:', err)
    return { success: false, error: 'Lỗi lấy danh sách đặt vé', details: err.message }
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
    return { success: false, error: 'Lỗi đối soát thanh toán', details: err.message }
  }
}
