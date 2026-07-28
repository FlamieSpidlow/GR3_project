export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function formatEmail(value, fallback = '') {
  return normalizeEmail(value) || fallback
}

export function mailtoUrl(value) {
  const email = normalizeEmail(value)
  return email ? `mailto:${email}` : ''
}

export function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '')
}

export function formatPhone(value, fallback = '') {
  const phone = normalizePhone(value)
  if (!phone) return fallback

  if (phone.startsWith('+84')) {
    const rest = phone.slice(3)
    if (rest.length === 9) return `+84 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`
  }

  if (phone.startsWith('0') && phone.length === 10) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`
  }

  if (phone.length === 9) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
  }

  return String(value || '').trim()
}

export function telUrl(value) {
  const phone = normalizePhone(value)
  return phone ? `tel:${phone}` : ''
}

export function normalizeWebsite(value) {
  const website = String(value || '').trim()
  if (!website) return ''
  if (/^https?:\/\//i.test(website)) return website
  return `https://${website}`
}

export function formatWebsite(value, fallback = '') {
  const website = String(value || '').trim()
  if (!website) return fallback
  return website.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
