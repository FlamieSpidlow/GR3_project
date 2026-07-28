const mongoose = require('mongoose')

const paymentLogSchema = new mongoose.Schema({
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
  provider: { type: String, enum: ['payos'], required: true, index: true },
  event: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true },
  valid: { type: Boolean, default: false },
  duplicate: { type: Boolean, default: false },
  message: { type: String, default: '' },
  payload: { type: mongoose.Schema.Types.Mixed },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

paymentLogSchema.index({ provider: 1, event: 1, createdAt: -1 })

module.exports = mongoose.model('PaymentLog', paymentLogSchema)
