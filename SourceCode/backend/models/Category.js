const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  nameNorm: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true })

categorySchema.index({ active: 1, sortOrder: 1, name: 1 })

module.exports = mongoose.model('Category', categorySchema)
