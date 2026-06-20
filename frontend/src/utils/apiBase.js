const resolveDefaultApiOrigin = () => {
  const apiPort = process.env.VUE_APP_API_PORT || '3000'
  if (typeof window === 'undefined') return `http://localhost:${apiPort}`

  const { protocol, hostname, port, origin } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  if (isLocalhost) return `http://localhost:${apiPort}`
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

