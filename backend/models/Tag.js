const mongoose = require('mongoose')

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameNorm: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true })

tagSchema.index({ name: 1 })
tagSchema.index({ featured: 1, sortOrder: 1 })

module.exports = mongoose.model('Tag', tagSchema)
