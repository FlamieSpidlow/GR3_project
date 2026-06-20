const FREE_PRICE_LABEL = 'Mi\u1ec5n ph\u00ed'
const VND_SUFFIX = '\u0111'
const RANGE_SEPARATOR_PATTERN = '[-\\u2013\\u2014]'

const removeVietnameseAccents = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0111/g, 'd')
  .replace(/\u0110/g, 'D')

const isFreePrice = (value) => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'number') return value <= 0

  const normalized = removeVietnameseAccents(value).toLowerCase().trim()
  if (!normalized) return true
  if (normalized.includes('mien phi') || normalized.includes('free')) return true

  const digits = normalized.replace(/[^\d]/g, '')
  return digits !== '' && Number.parseInt(digits, 10) === 0
}

const parsePriceToken = (token) => {
  const raw = String(token || '').trim()
  if (!raw) return null

  const hasK = /k/i.test(raw)
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null

  let value = Number.parseInt(digits, 10)
  if (!Number.isFinite(value)) return null

  if (hasK || (value > 0 && value < 1000 && !/[.,]/.test(raw))) {
    value *= 1000
  }

  return value
}

export const hasPriceRange = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return false

  const normalized = removeVietnameseAccents(raw).toLowerCase()
  const freeToNumber = new RegExp(`\\b(mien phi|free)\\b\\s*${RANGE_SEPARATOR_PATTERN}\\s*\\d`)
  const numberToValue = new RegExp(`\\d[\\d\\s.,]*(?:k|d|vnd|dong)?\\s*${RANGE_SEPARATOR_PATTERN}\\s*(?:\\d|\\b(?:mien phi|free)\\b)`)
  return freeToNumber.test(normalized) || numberToValue.test(normalized)
}

const extractPriceValues = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : []

  const input = String(value || '')
  const matches = input.match(/\d[\d\s.,]*(?:k|K)?/g) || []
  return matches
    .map(parsePriceToken)
    .filter(n => Number.isFinite(n) && n >= 0)
}

export const formatVnd = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return FREE_PRICE_LABEL
  return `${Math.round(n).toLocaleString('vi-VN')}${VND_SUFFIX}`
}

export const formatPrice = (value) => {
  if (isFreePrice(value)) return FREE_PRICE_LABEL

  const values = extractPriceValues(value)
  if (values.length === 0) return String(value || '').trim() || FREE_PRICE_LABEL

  return formatVnd(values[0])
}

export const parsePriceValue = (value) => {
  if (isFreePrice(value)) return 0

  const values = extractPriceValues(value)
  if (values.length === 0) return 0
  return values[0]
}

export default formatPrice
