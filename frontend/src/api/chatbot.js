import { apiUrl } from '../utils/apiBase'
import { getBrowserLocationCached } from '../utils/clientCache'

const API_URL = apiUrl('/chatbot')
const CONVERSATION_KEY = 'chatbotConversationId'
const LOCATION_TTL_MS = 5 * 60 * 1000

function getOrCreateConversationId() {
  try {
    const existing = sessionStorage.getItem(CONVERSATION_KEY)
    if (existing && String(existing).trim()) return String(existing)

    const generated = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

    sessionStorage.setItem(CONVERSATION_KEY, generated)
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

function getBrowserLocation() {
  return getBrowserLocationCached({ timeout: 4000, maximumAge: LOCATION_TTL_MS })
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
