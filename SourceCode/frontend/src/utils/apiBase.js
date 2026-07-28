const resolveDefaultApiOrigin = () => {
  const apiPort = process.env.VUE_APP_API_PORT || '3000'
  if (typeof window === 'undefined') return ''

  const { protocol, hostname, port, origin } = window.location
  if (process.env.NODE_ENV === 'production') return origin

  const isLocalHost = hostname === ['local', 'host'].join('') || hostname.startsWith('127.') || hostname === '::1'
  if (isLocalHost) return `${protocol}//${hostname}:${apiPort}`
  if (port === '8080' || port === '8081') return `${protocol}//${hostname}:${apiPort}`

  return origin
}

export const API_ORIGIN = (process.env.VUE_APP_API_ORIGIN || resolveDefaultApiOrigin()).replace(/\/$/, '')
export const API_BASE_URL = `${API_ORIGIN}/api`

export function apiUrl(path = '') {
  const normalizedPath = String(path || '')
  if (!normalizedPath) return API_BASE_URL
  return `${API_BASE_URL}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`
}

export function assetUrl(path = '') {
  const value = String(path || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value
  return `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`
}

