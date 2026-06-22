export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
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

export function placeMatchesCategory(place, categoryId) {
  if (!categoryId || categoryId === 'all') return true
  return getPlaceCategoryId(place) === categoryId
}

export function filterPlacesByCategory(places, categoryId) {
  if (!Array.isArray(places)) return []
  return places.filter(place => placeMatchesCategory(place, categoryId))
}

export function getCategoryOptions(places, categories = []) {
  const items = Array.isArray(places) ? places : []
  const availableIds = new Set(items.map(getPlaceCategoryId).filter(Boolean))
  const options = []
  const seen = new Set()

  const addOption = (category) => {
    const id = getCategoryId(category)
    const label = getCategoryLabel(category)
    if (!id || !label || seen.has(id) || !availableIds.has(id)) return
    seen.add(id)
    options.push({ id, label })
  }

  ;(Array.isArray(categories) ? categories : []).forEach(addOption)
  items.forEach(place => addOption(place && place.category))

  return [{ id: 'all', label: 'Tất cả' }, ...options]
}
