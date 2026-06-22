const mongoose = require('mongoose')

const homeContentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['explore', 'offer']
  },
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  badge: { type: String, default: '' },
  dateLabel: { type: String, default: '' },
  role: { type: String, default: '' },
  link: { type: String, default: '' },
  placeKeyword: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true })

homeContentSchema.index({ type: 1, active: 1, sortOrder: 1 })

module.exports = mongoose.model('HomeContent', homeContentSchema)
