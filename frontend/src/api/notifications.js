import { apiUrl } from '../utils/apiBase'
import { getAuthToken } from '../utils/authSession'

const API_URL = apiUrl('/notifications')

async function parseJsonSafe(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    return { ...data, status: res.status, ok: res.ok }
  }
  const text = await res.text()
  return { success: false, status: res.status, ok: res.ok, error: `Unexpected non-JSON response from server: ${text.slice(0, 500)}` }
}

function authHeaders() {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

export async function getNotifications() {
  const token = getAuthToken()
  if (!token) return { success: true, data: [] }

  const res = await fetch(API_URL, {
    method: 'GET',
    headers: authHeaders()
  })
  return parseJsonSafe(res)
}

export async function createNotification(payload) {
  const token = getAuthToken()
  if (!token) return { success: false, error: 'Vui long dang nhap' }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  })
  return parseJsonSafe(res)
}

export async function markNotificationsRead() {
  const token = getAuthToken()
  if (!token) return { success: true }

  const res = await fetch(`${API_URL}/read`, {
    method: 'PATCH',
    headers: authHeaders()
  })
  return parseJsonSafe(res)
}

export async function clearUserNotifications() {
  const token = getAuthToken()
  if (!token) return { success: true }

  const res = await fetch(API_URL, {
    method: 'DELETE',
    headers: authHeaders()
  })
  return parseJsonSafe(res)
}
