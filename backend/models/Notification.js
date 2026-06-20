const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: '', maxlength: 160 },
  message: { type: String, default: '', maxlength: 1000 },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  read: { type: Boolean, default: false }
}, { timestamps: true })

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
