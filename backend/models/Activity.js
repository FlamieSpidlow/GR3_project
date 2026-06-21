const mongoose = require('mongoose')

const activitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameNorm: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true })

activitySchema.index({ active: 1, sortOrder: 1 })
activitySchema.index({ name: 1 })

module.exports = mongoose.model('Activity', activitySchema)
