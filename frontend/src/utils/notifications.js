import { reactive } from 'vue'

const MAX_NOTIFICATIONS = 30

export const notificationState = reactive({
  items: [],
  confirm: null,
  prompt: null
})

function normalizeOptions(input) {
  if (typeof input === 'string') return { message: input }
  return input && typeof input === 'object' ? input : {}
}

export function notify(input = {}) {
  const options = normalizeOptions(input)
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: options.title || '',
    message: options.message || '',
    type: options.type || 'info',
    read: false,
    createdAt: Date.now()
  }

  notificationState.items.unshift(item)
  if (notificationState.items.length > MAX_NOTIFICATIONS) {
    notificationState.items.splice(MAX_NOTIFICATIONS)
  }

  return item
}

export function markAllNotificationsRead() {
  notificationState.items.forEach(item => {
    item.read = true
  })
}

export function clearNotifications() {
  notificationState.items.splice(0)
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
