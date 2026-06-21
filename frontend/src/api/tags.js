import { apiUrl } from '../utils/apiBase'

const API_URL = apiUrl('/tags')
const CACHE_TTL_MS = 10 * 60 * 1000
let featuredActivitiesCache = null
let featuredActivitiesPromise = null

export function clearFeaturedActivitiesCache() {
  featuredActivitiesCache = null
  featuredActivitiesPromise = null
}

export const DEFAULT_ACTIVITIES = [
  { id: 'swimming', label: 'Bơi lội', description: '', image: '/activities/swimming.jpg', sortOrder: 1 },
  { id: 'climbing', label: 'Leo núi nhân tạo', description: '', image: '/activities/climbing.jpg', sortOrder: 2 },
  { id: 'animal-care', label: 'Chăm sóc thú', description: '', image: '/activities/animal-care.jpg', sortOrder: 3 },
  { id: 'thrill', label: 'Cảm giác mạnh', description: '', image: '/activities/thrill.jpg', sortOrder: 4 },
  { id: 'history', label: 'Lịch sử', description: '', image: '/activities/history.jpg', sortOrder: 5 },
  { id: 'picnic', label: 'Picnic', description: '', image: '/activities/picnic.jpg', sortOrder: 6 },
  { id: 'farm', label: 'Nông trại', description: '', image: '/activities/farm.jpg', sortOrder: 7 },
  { id: 'museum-explore', label: 'Bảo tàng', description: '', image: '/activities/museum-explore.jpg', sortOrder: 8 },
  { id: 'craft-village', label: 'Làng nghề & thủ công', description: '', image: '/activities/craft-village.jpg', sortOrder: 9 },
  { id: 'walking-checkin', label: 'Đi bộ & check-in', description: '', image: '/activities/walking-checkin.jpg', sortOrder: 10 },
  { id: 'performance', label: 'Biểu diễn nghệ thuật', description: '', image: '/activities/performance.jpg', sortOrder: 11 },
  { id: 'nature-explore', label: 'Thiên nhiên', description: '', image: '/activities/nature-explore.jpg', sortOrder: 12 }
]

function withActivityFallback(data) {
  if (data && data.success && Array.isArray(data.data) && data.data.length > 0) return data
  return { success: true, data: DEFAULT_ACTIVITIES }
}

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
        const normalized = withActivityFallback(data)
        featuredActivitiesCache = { data: normalized, at: Date.now() }
        return normalized
      })
      .catch(err => {
        console.error('Get featured activities error:', err)
        const fallback = withActivityFallback({ success: false, error: 'Loi lay danh sach hoat dong', details: err.message })
        featuredActivitiesCache = { data: fallback, at: Date.now() }
        return fallback
      })
      .finally(() => {
        featuredActivitiesPromise = null
      })

    return featuredActivitiesPromise
  } catch (err) {
    console.error('Get featured activities error:', err)
    return withActivityFallback({ success: false, error: 'Loi lay danh sach hoat dong', details: err.message })
  }
}
