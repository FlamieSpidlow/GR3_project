const mongoose = require('mongoose')

const bookingItemSchema = new mongoose.Schema({
  ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  name: { type: String, required: true },
  audience: { type: String, enum: ['adult', 'child', 'general'], default: 'general' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false })

const bookingSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true, index: true },
  visitDate: { type: Date, required: true, index: true },
  items: { type: [bookingItemSchema], default: [] },
  totalQuantity: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'VND' },
  note: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'paid', 'expired', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  paidAt: { type: Date },
  expiresAt: { type: Date, required: true, index: true },
  cancelledAt: { type: Date },
  refundedAt: { type: Date }
}, { timestamps: true })

bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ place: 1, visitDate: 1 })

module.exports = mongoose.model('Booking', bookingSchema)
