const normalizeComparable = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const cleanAddress = (address, placeName) => {
  const rawAddress = String(address || '').trim()
  const rawName = String(placeName || '').trim()
  if (!rawAddress) return ''
  if (!rawName) return rawAddress

  const addressNorm = normalizeComparable(rawAddress)
  const nameNorm = normalizeComparable(rawName)
  if (!addressNorm || !nameNorm || !addressNorm.startsWith(nameNorm)) return rawAddress

  const separators = [',', '-', '–', '|']
  for (const separator of separators) {
    const prefix = `${rawName}${separator}`
    if (rawAddress.toLowerCase().startsWith(prefix.toLowerCase())) {
      return rawAddress.slice(prefix.length).trim()
    }
  }

  if (rawAddress.length > rawName.length) {
    const nextChar = rawAddress.charAt(rawName.length)
    if (/[\s,|\-–]/.test(nextChar)) {
      return rawAddress.slice(rawName.length + 1).trim()
    }
  }

  return rawAddress
}

export default cleanAddress
