const coerceCoordinate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numberValue = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const buildDestination = (place = {}) => {
  const lat = coerceCoordinate(place.lat)
  const lng = coerceCoordinate(place.lng)
  if (lat !== null && lng !== null) return `${lat},${lng}`

  const parts = [place.name, place.address]
    .map(value => String(value || '').trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : ''
}

export const hasMapTarget = (place = {}) => Boolean(buildDestination(place))

export const buildMapsSearchUrl = (place = {}) => {
  const destination = buildDestination(place)
  if (!destination) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`
}

export const buildMapsDirectionsUrl = (place = {}) => {
  const destination = buildDestination(place)
  if (!destination) return ''
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

export const buildMapsEmbedUrl = (place = {}) => {
  const destination = buildDestination(place)
  if (!destination) return ''
  return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=15&output=embed`
}
