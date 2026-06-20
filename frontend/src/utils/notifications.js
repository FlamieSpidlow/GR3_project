import { reactive } from 'vue'
import {
  clearUserNotifications,
  createNotification,
  getNotifications,
  markNotificationsRead
} from '../api/notifications'
import { getAuthToken } from './authSession'

const MAX_NOTIFICATIONS = 30

export const notificationState = reactive({
  items: [],
  confirm: null,
  prompt: null,
  isLoading: false
})

function normalizeOptions(input) {
  if (typeof input === 'string') return { message: input }
  return input && typeof input === 'object' ? input : {}
}

function normalizeNotification(input) {
  return {
    id: input.id || input._id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: input.title || '',
    message: input.message || '',
    type: ['info', 'success', 'warning', 'error'].includes(input.type) ? input.type : 'info',
    read: !!input.read,
    createdAt: input.createdAt || Date.now()
  }
}

function trimList() {
  if (notificationState.items.length > MAX_NOTIFICATIONS) {
    notificationState.items.splice(MAX_NOTIFICATIONS)
  }
}

export async function loadNotifications() {
  const token = getAuthToken()
  if (!token) {
    notificationState.items.splice(0)
    return { success: true, data: [] }
  }

  notificationState.isLoading = true
  try {
    const res = await getNotifications()
    if (res && res.success && Array.isArray(res.data)) {
      notificationState.items.splice(0, notificationState.items.length, ...res.data.map(normalizeNotification))
    }
    return res
  } catch (err) {
    console.warn('Failed to load notifications:', err)
    return { success: false, error: err.message }
  } finally {
    notificationState.isLoading = false
  }
}

export function notify(input = {}) {
  const options = normalizeOptions(input)
  const item = normalizeNotification({
    title: options.title,
    message: options.message,
    type: options.type,
    read: false,
    createdAt: Date.now()
  })

  notificationState.items.unshift(item)
  trimList()

  if (getAuthToken()) {
    createNotification({
      title: item.title,
      message: item.message,
      type: item.type
    })
      .then(res => {
        if (res && res.success && res.data) {
          const saved = normalizeNotification(res.data)
          Object.assign(item, saved)
          if (!notificationState.items.some(existing => existing.id === saved.id)) {
            notificationState.items.unshift(saved)
            trimList()
          }
        }
      })
      .catch(err => {
        console.warn('Failed to save notification:', err)
      })
  }

  return item
}

export function markAllNotificationsRead() {
  notificationState.items.forEach(item => {
    item.read = true
  })

  if (getAuthToken()) {
    markNotificationsRead().catch(err => {
      console.warn('Failed to mark notifications read:', err)
    })
  }
}

export function clearNotifications({ remote = true } = {}) {
  notificationState.items.splice(0)

  if (remote && getAuthToken()) {
    clearUserNotifications().catch(err => {
      console.warn('Failed to clear notifications:', err)
    })
  }
}

export function requestConfirmation(input = {}) {
  const options = normalizeOptions(input)
  return new Promise((resolve) => {
    notificationState.confirm = {
      title: options.title || 'Xác nhận thao tác',
      message: options.message || '',
      confirmText: options.confirmText || 'Xác nhận',
      cancelText: options.cancelText || 'Hủy',
      tone: options.tone || 'default',
      resolve
    }
  })
}

export function resolveConfirmation(value) {
  if (!notificationState.confirm) return
  const current = notificationState.confirm
  notificationState.confirm = null
  current.resolve(!!value)
}

export function requestPrompt(input = {}) {
  const options = normalizeOptions(input)
  return new Promise((resolve) => {
    notificationState.prompt = {
      title: options.title || 'Nhập thông tin',
      message: options.message || '',
      value: options.defaultValue || '',
      placeholder: options.placeholder || '',
      confirmText: options.confirmText || 'Lưu',
      cancelText: options.cancelText || 'Hủy',
      resolve
    }
  })
}

export function resolvePrompt(value, cancelled = false) {
  if (!notificationState.prompt) return
  const current = notificationState.prompt
  notificationState.prompt = null
  current.resolve(cancelled ? null : String(value || ''))
}
