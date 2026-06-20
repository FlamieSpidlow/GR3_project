import { apiUrl } from '../utils/apiBase'
import { getAuthToken } from '../utils/authSession'

const API_URL = apiUrl('/places')
const CACHE_TTL_MS = 5 * 60 * 1000
let allPlacesCache = null
let allPlacesPromise = null

export function clearAllPlacesCache() {
  allPlacesCache = null
  allPlacesPromise = null
}

const getAuthHeader = () => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function searchPlaces(query, limit = 10, lat = null, lng = null, age = null) {
  try {
    const trimmedQuery = String(query || '').trim()
    let url = `${API_URL}/search?query=${encodeURIComponent(trimmedQuery)}&limit=${encodeURIComponent(limit)}`
    if (lat != null && lng != null) {
      url += `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    }
    if (age != null) {
      url += `&age=${encodeURIComponent(age)}`
    }
    const res = await fetch(url)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Search places error:', err)
    return { success: false, error: 'Lỗi tìm kiếm địa điểm', details: err.message }
  }
}

export async function getPlaceDetails(placeId) {
  try {
    const res = await fetch(`${API_URL}/details/${encodeURIComponent(placeId)}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get place details error:', err)
    return { success: false, error: 'Lỗi lấy chi tiết địa điểm', details: err.message }
  }
}

export async function getPlaceById(id) {
  try {
    const res = await fetch(`${API_URL}/place/${encodeURIComponent(id)}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get place by id error:', err)
    return { success: false, error: 'Lỗi lấy chi tiết địa điểm', details: err.message }
  }
}

export async function getNearbyPlaces(lat, lng, radius = 1000, limit = 10) {
  try {
    const res = await fetch(`${API_URL}/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get nearby places error:', err)
    return { success: false, error: 'Lỗi tìm địa điểm gần đây', details: err.message }
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`${API_URL}/reverse?lat=${lat}&lng=${lng}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Reverse geocode error:', err)
    return { success: false, error: 'Lỗi reverse geocode', details: err.message }
  }
}

export async function getRandomPlaces(limit = 4) {
  try {
    const res = await fetch(`${API_URL}/random?limit=${limit}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get random places error:', err)
    return { success: false, error: 'Lỗi lấy địa điểm ngẫu nhiên', details: err.message }
  }
}

export async function getAllPlaces({ force = false } = {}) {
  try {
    if (!force && allPlacesCache && Date.now() - allPlacesCache.at < CACHE_TTL_MS) {
      return allPlacesCache.data
    }
    if (!force && allPlacesPromise) return allPlacesPromise

    allPlacesPromise = fetch(`${API_URL}/all`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success) allPlacesCache = { data, at: Date.now() }
        return data
      })
      .finally(() => {
        allPlacesPromise = null
      })

    return allPlacesPromise
  } catch (err) {
    console.error('Get all places error:', err)
    return { success: false, error: 'L?i l?y danh s?ch ??a ?i?m', details: err.message }
  }
}

export async function submitPlaceImages(placeId, files) {
  try {
    const form = new FormData()
    ;(files || []).forEach(f => form.append('images', f))

    const res = await fetch(`${API_URL}/${encodeURIComponent(placeId)}/images/submissions`, {
      method: 'POST',
      headers: {
        ...getAuthHeader()
      },
      body: form
    })

    const data = await res.json()
    return data
  } catch (err) {
    console.error('Submit place images error:', err)
    return { success: false, error: 'Lỗi gửi ảnh địa điểm', details: err.message }
  }
}

export async function getMyPlaceImageSubmissions(placeId) {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(placeId)}/images/submissions/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Get my place image submissions error:', err)
    return { success: false, error: 'Lỗi lấy danh sách ảnh đã gửi', details: err.message }
  }
}
