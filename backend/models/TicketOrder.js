const mongoose = require('mongoose')

const ticketOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true },
  visitDate: { type: Date, required: true },
  adultQuantity: { type: Number, default: 0, min: 0 },
  childQuantity: { type: Number, default: 1, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
  totalPrice: { type: Number, default: 0, min: 0 },
  note: { type: String, default: '' },
  status: {
    type: String,
    enum: ['unpaid', 'pending', 'confirmed', 'cancelled', 'used'],
    default: 'unpaid'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  paymentToken: { type: String, unique: true, sparse: true },
  paidAt: { type: Date },
  ticketCode: { type: String, unique: true, sparse: true },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  usedAt: { type: Date },
  cancelledAt: { type: Date }
}, { timestamps: true })

ticketOrderSchema.index({ user: 1, createdAt: -1 })
ticketOrderSchema.index({ place: 1, visitDate: 1 })
ticketOrderSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('TicketOrder', ticketOrderSchema)
