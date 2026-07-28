const mongoose = require('mongoose')

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameNorm: { type: String, required: true, unique: true }
}, { timestamps: true })

tagSchema.index({ name: 1 })

module.exports = mongoose.model('Tag', tagSchema)
