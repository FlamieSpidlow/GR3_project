const API_URL = 'http://localhost:3000/api/auth'

async function parseJsonSafe(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  // Attempt to return text for debugging when server returns HTML or plain text
  const text = await res.text()
  return { success: false, error: `Unexpected non-JSON response from server: ${text.slice(0, 500)}` }
}

export async function registerUser(userData) {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  return parseJsonSafe(res)
}

export async function loginUser(credentials) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  })
  return parseJsonSafe(res)
}

export async function forgotPassword(email) {
  const res = await fetch(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  return parseJsonSafe(res)
}

export async function resetPassword({ email, code, newPassword }) {
  const res = await fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword })
  })
  return parseJsonSafe(res)
}

export async function updateProfile(data) {
  const token = localStorage.getItem('authToken')
  const res = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(data)
  })
  return parseJsonSafe(res)
}

export async function changePassword({ currentPassword, newPassword }) {
  const token = localStorage.getItem('authToken')
  const res = await fetch(`${API_URL}/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ currentPassword, newPassword })
  })
  return parseJsonSafe(res)
}

export async function getProfile() {
  const token = localStorage.getItem('authToken')
  const res = await fetch(`${API_URL}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  })
  return parseJsonSafe(res)
}

export async function updateLocation(data) {
  const token = localStorage.getItem('authToken')
  const res = await fetch(`${API_URL}/location`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(data)
  })
  return parseJsonSafe(res)
}

export async function saveSearchHistory(query) {
  const token = localStorage.getItem('authToken')
  const res = await fetch(`${API_URL}/search-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ query })
  })
  return parseJsonSafe(res)
}

export async function clearSearchHistory() {
  const token = localStorage.getItem('authToken')
  const res = await fetch(`${API_URL}/search-history`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  })
  return parseJsonSafe(res)
}