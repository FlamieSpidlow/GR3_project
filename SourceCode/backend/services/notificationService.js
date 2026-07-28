const Notification = require('../models/Notification')

const ALLOWED_TYPES = new Set(['info', 'success', 'warning', 'error'])

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

async function createUserNotification(userId, { title = '', message = '', type = 'info' } = {}) {
  try {
    if (!userId) return null
    const notification = await Notification.create({
      user: userId,
      title: cleanText(title, 160),
      message: cleanText(message, 1000),
      type: ALLOWED_TYPES.has(type) ? type : 'info',
      read: false
    })
    return notification
  } catch (err) {
    console.error('Create user notification error:', err)
    return null
  }
}

module.exports = { createUserNotification }
