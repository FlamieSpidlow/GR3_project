import { apiUrl } from '../utils/apiBase'

const API_URL = apiUrl('/chatbot')
const CONVERSATION_KEY = 'chatbotConversationId'
const LOCATION_KEY = 'chatbotUserLocation'
const LOCATION_TTL_MS = 5 * 60 * 1000

function getOrCreateConversationId() {
  try {
    const existing = localStorage.getItem(CONVERSATION_KEY)
    if (existing && String(existing).trim()) return String(existing)

    const generated = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

    localStorage.setItem(CONVERSATION_KEY, generated)
    return generated
  } catch {
    return 'default'
  }
}

async function parseJsonSafe(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  const text = await res.text()
  return { success: false, error: `Unexpected non-JSON response from server: ${text.slice(0, 500)}` }
}

function readCachedLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null
    if (parsed.at && Date.now() - parsed.at > LOCATION_TTL_MS) return null
    return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    return null
  }
}

function cacheLocation(lat, lng) {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify({ lat, lng, at: Date.now() }))
  } catch {
    // ignore
  }
}

function getBrowserLocation() {
  const cached = readCachedLocation()
  if (cached) return Promise.resolve(cached)

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos && pos.coords ? pos.coords.latitude : null
        const lng = pos && pos.coords ? pos.coords.longitude : null
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          cacheLocation(lat, lng)
          resolve({ lat, lng })
        } else {
          resolve(null)
        }
      },
      () => resolve(null),
      { timeout: 4000, maximumAge: LOCATION_TTL_MS }
    )
  })
}

export async function askChatbot(question) {
  const conversationId = getOrCreateConversationId()
  const userLocation = await getBrowserLocation()
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversationId, userLocation })
  })
   
  return parseJsonSafe(res)
}
