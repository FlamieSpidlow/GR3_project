const DEFAULT_LOCATION_TTL_MS = 10 * 60 * 1000

let browserLocation = null
let browserLocationPromise = null

export function getBrowserLocationCached({ timeout = 5000, maximumAge = DEFAULT_LOCATION_TTL_MS } = {}) {
  if (browserLocation && Date.now() - browserLocation.at <= maximumAge) {
    return Promise.resolve({ lat: browserLocation.lat, lng: browserLocation.lng })
  }

  if (browserLocationPromise) return browserLocationPromise

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }

  browserLocationPromise = new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos && pos.coords ? pos.coords.latitude : null
        const lng = pos && pos.coords ? pos.coords.longitude : null
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          browserLocation = { lat, lng, at: Date.now() }
          resolve({ lat, lng })
        } else {
          resolve(null)
        }
      },
      () => resolve(null),
      { timeout, maximumAge }
    )
  }).finally(() => {
    browserLocationPromise = null
  })

  return browserLocationPromise
}

export function setBrowserLocationCache(lat, lng) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    browserLocation = { lat, lng, at: Date.now() }
  }
}

export function clearBrowserLocationCache() {
  browserLocation = null
  browserLocationPromise = null
}
