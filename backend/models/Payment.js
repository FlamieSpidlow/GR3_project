const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['vnpay', 'vietqr'], required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'pending_review', 'success', 'paid', 'expired', 'cancelled', 'refunded', 'failed'],
    default: 'pending',
    index: true
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'VND' },
  orderRef: { type: String, required: true, unique: true },
  providerTransactionId: { type: String, sparse: true, index: true },
  payUrl: { type: String, default: '' },
  qrUrl: { type: String, default: '' },
  transferContent: { type: String, default: '' },
  rawRequest: { type: mongoose.Schema.Types.Mixed },
  rawVerifiedPayload: { type: mongoose.Schema.Types.Mixed },
  paidAt: { type: Date },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  expiresAt: { type: Date, required: true, index: true },
  failureReason: { type: String, default: '' }
}, { timestamps: true })

paymentSchema.index({ provider: 1, orderRef: 1 }, { unique: true })

module.exports = mongoose.model('Payment', paymentSchema)
