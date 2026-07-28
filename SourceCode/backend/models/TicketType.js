const mongoose = require('mongoose')

const ticketTypeSchema = new mongoose.Schema({
  place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  audience: { type: String, enum: ['adult', 'child', 'general'], default: 'general' },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'VND' },
  active: { type: Boolean, default: true },
  minPerBooking: { type: Number, default: 0, min: 0 },
  maxPerBooking: { type: Number, default: 50, min: 1 },
  sortOrder: { type: Number, default: 100 }
}, { timestamps: true })

ticketTypeSchema.index({ place: 1, audience: 1, active: 1 })

module.exports = mongoose.model('TicketType', ticketTypeSchema)
