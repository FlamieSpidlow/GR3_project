import { apiUrl } from '../utils/apiBase'
import { getAuthToken } from '../utils/authSession'

const API_URL = apiUrl('/auth')
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000
let profileCache = null
let profilePromise = null
let profilePromiseToken = ''

export function clearProfileCache() {
  profileCache = null
  profilePromise = null
  profilePromiseToken = ''
}

function setProfileCache(data) {
  if (data && data.success && data.user) {
    profileCache = { data, token: getAuthToken(), at: Date.now() }
  }
  return data
}

function updateCachedUser(patch) {
  if (!profileCache || !profileCache.data || !profileCache.data.user) return
  profileCache = {
    ...profileCache,
    at: Date.now(),
    data: {
      ...profileCache.data,
      user: { ...profileCache.data.user, ...patch }
    }
  }
}

async function parseJsonSafe(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    return { ...data, status: res.status, ok: res.ok }
  }
  // Attempt to return text for debugging when server returns HTML or plain text
  const text = await res.text()
  return { success: false, status: res.status, ok: res.ok, error: `Unexpected non-JSON response from server: ${text.slice(0, 500)}` }
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
  return parseJsonSafe(res).then(setProfileCache)
}

export async function loginWithGoogle(credential) {
  const res = await fetch(`${API_URL}/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential })
  })
  return parseJsonSafe(res).then(setProfileCache)
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
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(data)
  })
  return parseJsonSafe(res).then(setProfileCache)
}

export async function changePassword({ currentPassword, newPassword }) {
  const token = getAuthToken()
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

export async function getProfile({ force = false } = {}) {
  const token = getAuthToken()
  if (!token) return { success: false, error: 'Vui long dang nhap' }

  if (!force && profileCache && profileCache.token === token && Date.now() - profileCache.at < PROFILE_CACHE_TTL_MS) {
    return profileCache.data
  }
  if (!force && profilePromise && profilePromiseToken === token) return profilePromise

  profilePromiseToken = token
  profilePromise = fetch(`${API_URL}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  })
    .then(parseJsonSafe)
    .then(setProfileCache)
    .finally(() => {
      profilePromise = null
      profilePromiseToken = ''
    })

  return profilePromise
}

export async function updateLocation(data) {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/location`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(data)
  })
  const parsed = await parseJsonSafe(res)
  if (parsed && parsed.success && parsed.user && profileCache && profileCache.data && profileCache.data.user) {
    updateCachedUser(parsed.user)
  }
  return parsed
}

export async function updateFavorite(placeId, favorited) {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/favorites/${encodeURIComponent(placeId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ favorited })
  })
  const parsed = await parseJsonSafe(res)
  if (parsed && parsed.success && Array.isArray(parsed.favorites) && profileCache && profileCache.data && profileCache.data.user) {
    updateCachedUser({ favorites: parsed.favorites })
  }
  return parsed
}

export async function saveSearchHistory(query) {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/search-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ query })
  })
  const parsed = await parseJsonSafe(res)
  if (parsed && parsed.success && Array.isArray(parsed.searchHistory)) {
    updateCachedUser({ searchHistory: parsed.searchHistory })
  }
  return parsed
}

export async function clearSearchHistory() {
  const token = getAuthToken()
  const res = await fetch(`${API_URL}/search-history`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  })
  const parsed = await parseJsonSafe(res)
  if (parsed && parsed.success) {
    updateCachedUser({ searchHistory: [] })
  }
  return parsed
}
