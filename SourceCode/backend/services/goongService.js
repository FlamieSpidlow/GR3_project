const fetch = require('node-fetch')
const { GOONG_API_URL, PLAYGROUND_KEYWORDS } = require('../constants')

// Haversine formula to compute distance in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Hàm hỗ trợ lấy API Key mới nhất từ môi trường
 */
const getApiKey = () => {
  const key = process.env.GOONG_API_KEY;
  if (!key) {
    console.error('❌ Error: GOONG_API_KEY is not defined in .env file');
    throw new Error('Goong API key not configured');
  }
  return key;
};

/**
 * Search for places by query string
 */
async function searchPlacesByQuery(query, limit = 10, lat = null, lng = null) {
  const apiKey = getApiKey(); // Lấy key trực tiếp khi hàm được gọi

  const url = `${GOONG_API_URL}/Place/AutoComplete?api_key=${apiKey}&input=${encodeURIComponent(query)}&limit=${limit}`
  
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`)
  }

  const preds = (data.predictions || []).map(place => {
    const main = place.structured_formatting?.main_text || place.description || ''
    const secondary = place.structured_formatting?.secondary_text || ''
    return {
      id: place.place_id,
      name: main,
      placeId: place.place_id,
      mainText: main,
      secondaryText: secondary
    }
  })

  // Filter out overly-generic results that are just the search keyword like "khu vui chơi"
  const genericSet = new Set(PLAYGROUND_KEYWORDS.map(k => k.toLowerCase().trim()))
  const filtered = preds.filter(p => {
    const nm = (p.mainText || '').toLowerCase().trim()
    if (!nm) return false
    if (genericSet.has(nm)) return false
    return true
  })

  return filtered.length > 0 ? filtered : preds
}

// If lat/lng provided, compute distances for autocomplete preds and sort by nearest
async function searchPlacesByQueryWithDistance(query, limit = 10, lat = null, lng = null) {
  const places = await searchPlacesByQuery(query, limit)
  if (!lat || !lng) return places

  // For each place, try to get coordinates via getPlaceDetails then compute distance
  const enriched = await Promise.all(places.map(async (p) => {
    if (p.placeId) {
      try {
        const details = await getPlaceDetails(p.placeId)
        if (details && details.lat != null && details.lng != null) {
          return Object.assign({}, p, { lat: details.lat, lng: details.lng, distance: haversineDistance(lat, lng, details.lat, details.lng) })
        }
      } catch (err) {
        // ignore
      }
    }
    return Object.assign({}, p, { distance: null })
  }))

  enriched.sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0
    if (a.distance == null) return 1
    if (b.distance == null) return -1
    return a.distance - b.distance
  })

  return enriched.slice(0, limit)
}


/**
 * Search for nearby playgrounds using AutoComplete with keywords
 * Falls back to Geocode if AutoComplete doesn't return results
 */
async function searchNearbyPlaygrounds(lat, lng, radius = 3000, limit = 12) {
  const apiKey = getApiKey()

  // Aggregate predictions across all playground keywords to provide variety
  const collected = []
  for (const keyword of PLAYGROUND_KEYWORDS) {
    try {
      const url = `${GOONG_API_URL}/Place/AutoComplete?api_key=${apiKey}&input=${encodeURIComponent(keyword)}&limit=${limit}`
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok && data.predictions && data.predictions.length > 0) {
        console.log(`✅ Found ${data.predictions.length} playgrounds for "${keyword}"`)
        const preds = await Promise.all(data.predictions.map(async (place, idx) => {
          let placeData = {
            id: place.place_id || `${keyword}-${idx}`,
            name: place.structured_formatting?.main_text || place.description || 'Unknown Place',
            address: place.structured_formatting?.secondary_text || '',
            placeId: place.place_id || '',
            types: [],
            lat: null,
            lng: null
          }
          
          // Try to get coordinates from Place/Detail API
          if (place.place_id) {
            try {
              const details = await getPlaceDetails(place.place_id)
              if (details && details.lat != null && details.lng != null) {
                placeData.lat = details.lat
                placeData.lng = details.lng
              }
            } catch (err) {
              console.warn(`⚠️  Failed to get details for ${place.place_id}`)
            }
          }
          
          return placeData
        }))
        collected.push(...preds)
      }
    } catch (err) {
      console.warn(`⚠️  Failed to search for "${keyword}":`, err.message)
      continue
    }
  }

  if (collected.length > 0) {
    const genericSet = new Set(PLAYGROUND_KEYWORDS.map(k => k.toLowerCase().trim()))
    const dedupeMap = new Map()
    for (const p of collected) {
      const nm = (p.name || '').toLowerCase().trim()
      if (!nm) continue
      if (genericSet.has(nm)) continue
      const key = p.placeId || p.id
      if (!key) continue
      if (!dedupeMap.has(key)) dedupeMap.set(key, p)
    }

    const results = Array.from(dedupeMap.values())
    if (results.length === 0) {
      const fallbackMap = new Map()
      for (const p of collected) {
        const key = p.placeId || p.id
        if (!fallbackMap.has(key)) fallbackMap.set(key, p)
      }
      return Array.from(fallbackMap.values()).slice(0, limit)
    }

    return results.slice(0, limit)
  }

  // Fallback: Use Geocode to get nearby results
  console.log('📍 Falling back to Geocode for nearby places...')
  try {
    const url = `${GOONG_API_URL}/Geocode?latlng=${lat},${lng}&api_key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (response.ok && data.results) {
      return data.results.map((result, idx) => ({
        id: result.place_id || idx,
        name: result.formatted_address || 'Unknown Place',
        address: result.formatted_address || '',
        lat: result.geometry?.location?.lat,
        lng: result.geometry?.location?.lng,
        placeId: result.place_id || '',
        types: result.types || []
      })).slice(0, limit)
    }
  } catch (err) {
    console.warn('Geocode fallback failed:', err.message)
  }

  // Return empty array if all methods fail
  return []
}

/**
 * Get place details by place ID
 */
async function getPlaceDetails(placeId) {
  const apiKey = getApiKey(); // Lấy key trực tiếp khi hàm được gọi

  const url = `${GOONG_API_URL}/Place/Detail?place_id=${encodeURIComponent(placeId)}&api_key=${apiKey}`
  
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`)
  }

  const place = data.result || {}
  return {
    id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    lat: place.geometry?.location?.lat,
    lng: place.geometry?.location?.lng,
    phone: place.phone_number || '',
    website: place.website || '',
    rating: place.rating || null,
    types: place.types || [],
    openingHours: place.opening_hours?.weekday_text || []
  }
}

module.exports = {
  searchPlacesByQuery,
  searchPlacesByQueryWithDistance,
  searchNearbyPlaygrounds,
  getPlaceDetails,
  reverseGeocode
}

/**
 * Reverse geocode: lat,lng -> formatted address
 */
async function reverseGeocode(lat, lng) {
  const apiKey = getApiKey()
  try {
    const url = `${GOONG_API_URL}/Geocode?latlng=${lat},${lng}&api_key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`)
    }
    if (data && data.results && data.results.length > 0) {
      return data.results[0].formatted_address || null
    }
  } catch (err) {
    console.warn('Reverse geocode failed:', err.message)
  }
  return null
}