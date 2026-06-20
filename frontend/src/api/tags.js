import { apiUrl } from '../utils/apiBase'

const API_URL = apiUrl('/tags')
const CACHE_TTL_MS = 10 * 60 * 1000
let featuredActivitiesCache = null
let featuredActivitiesPromise = null

async function parseJsonSafe(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  const text = await res.text()
  return { success: false, error: `Unexpected non-JSON response from server: ${text.slice(0, 500)}` }
}

export async function getFeaturedActivities({ force = false } = {}) {
  try {
    if (!force && featuredActivitiesCache && Date.now() - featuredActivitiesCache.at < CACHE_TTL_MS) {
      return featuredActivitiesCache.data
    }
    if (!force && featuredActivitiesPromise) return featuredActivitiesPromise

    featuredActivitiesPromise = fetch(`${API_URL}/activities`)
      .then(parseJsonSafe)
      .then(data => {
        if (data && data.success) featuredActivitiesCache = { data, at: Date.now() }
        return data
      })
      .finally(() => {
        featuredActivitiesPromise = null
      })

    return featuredActivitiesPromise
  } catch (err) {
    console.error('Get featured activities error:', err)
    return { success: false, error: 'L?i l?y danh s?ch ho?t ??ng', details: err.message }
  }
}
