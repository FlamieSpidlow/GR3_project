export const PLACE_CATEGORIES = [
  { id: 'all', label: 'Tất cả', aliases: [] },
  { id: 'indoor', label: 'Trong nhà', aliases: ['trong nha', 'indoor', 'nha bong'] },
  { id: 'outdoor', label: 'Ngoài trời', aliases: ['ngoai troi', 'outdoor', 'cong vien'] },
  { id: 'water', label: 'Nước', aliases: ['boi', 'ho boi', 'be boi', 'cong vien nuoc', 'water'] },
  { id: 'nature', label: 'Thiên nhiên', aliases: ['thien nhien', 'sinh thai', 'eco'] },
  { id: 'farm', label: 'Nông trại', aliases: ['nong trai', 'farm'] },
  { id: 'museum', label: 'Bảo tàng', aliases: ['bao tang', 'museum'] },
  { id: 'culture', label: 'Văn hóa', aliases: ['van hoa', 'lich su', 'di tich', 'tam linh', 'truyen thong'] },
  { id: 'picnic', label: 'Picnic', aliases: ['picnic', 'da ngoai'] },
  { id: 'animal', label: 'Động vật', aliases: ['dong vat', 'cham soc thu', 'so thu', 'zoo'] }
]

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

export function getPlaceSearchText(place) {
  const parts = [
    place && place.name,
    place && place.address,
    place && place.description,
    ...(place && Array.isArray(place.tags) ? place.tags : []),
    ...(place && Array.isArray(place.types) ? place.types : [])
  ]
  return parts.map(normalizeText).filter(Boolean).join(' ')
}

export function placeMatchesCategory(place, categoryId) {
  if (!categoryId || categoryId === 'all') return true
  const category = PLACE_CATEGORIES.find(item => item.id === categoryId)
  if (!category) return true

  const text = getPlaceSearchText(place)
  return category.aliases.some(alias => text.includes(normalizeText(alias)))
}

export function filterPlacesByCategory(places, categoryId) {
  if (!Array.isArray(places)) return []
  return places.filter(place => placeMatchesCategory(place, categoryId))
}

export function getCategoryOptions(places) {
  const items = Array.isArray(places) ? places : []
  return PLACE_CATEGORIES.filter(category =>
    category.id === 'all' || items.some(place => placeMatchesCategory(place, category.id))
  )
}
