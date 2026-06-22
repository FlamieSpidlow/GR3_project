export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/Ä‘/g, 'd')
    .replace(/Ä/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getCategoryId(category) {
  if (!category) return ''
  if (typeof category === 'string') return category
  return category.id || category._id || ''
}

export function getCategoryLabel(category) {
  if (!category) return ''
  if (typeof category === 'string') return category
  return category.name || category.label || ''
}

export function getPlaceCategoryId(place) {
  if (!place) return ''
  return getCategoryId(place.category) || place.categoryId || ''
}

export function getPlaceCategoryKey(place) {
  return normalizeText(getCategoryLabel(place && place.category))
}

export function placeMatchesCategory(place, categoryId, categoryLabel = '') {
  if (!categoryId || categoryId === 'all') return true
  return getPlaceCategoryId(place) === categoryId ||
    (!!categoryLabel && getPlaceCategoryKey(place) === normalizeText(categoryLabel))
}

export function filterPlacesByCategory(places, categoryId, categoryLabel = '') {
  if (!Array.isArray(places)) return []
  return places.filter(place => placeMatchesCategory(place, categoryId, categoryLabel))
}

export function getCategoryOptions(places, categories = []) {
  const items = Array.isArray(places) ? places : []
  const countsById = items.reduce((acc, place) => {
    const id = getPlaceCategoryId(place)
    if (id) acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})
  const countsByName = items.reduce((acc, place) => {
    const key = getPlaceCategoryKey(place)
    if (key) acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const options = (Array.isArray(categories) ? categories : [])
    .map(category => {
      const id = getCategoryId(category)
      const label = getCategoryLabel(category)
      return {
        id,
        label,
        count: countsById[id] || countsByName[normalizeText(label)] || 0
      }
    })
    .filter(category => category.id && category.label)

  return [{ id: 'all', label: 'Tất cả', count: items.length }, ...options]
}
