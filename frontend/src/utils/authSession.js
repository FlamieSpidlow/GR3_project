export function getAuthToken() {
  return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || ''
}

export function getAuthUserRaw() {
  return sessionStorage.getItem('user') || localStorage.getItem('user') || ''
}

export function getAuthUser() {
  const raw = getAuthUserRaw()
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuthSession(token, user) {
  if (token) sessionStorage.setItem('authToken', token)
  if (user) sessionStorage.setItem('user', JSON.stringify(user))

  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
}

export function clearAuthSession() {
  sessionStorage.removeItem('authToken')
  sessionStorage.removeItem('user')
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
}
