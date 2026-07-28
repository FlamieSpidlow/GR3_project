const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true, index: true },
  visitDate: { type: Date, required: true, index: true },
  name: { type: String, required: true },
  lineIndex: { type: Number, required: true },
  itemIndex: { type: Number, required: true },
  status: {
    type: String,
    enum: ['valid', 'paid', 'expired', 'cancelled', 'refunded', 'used'],
    default: 'valid',
    index: true
  },
  qrPayload: { type: String, required: true },
  usedAt: { type: Date },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

ticketSchema.index({ booking: 1, lineIndex: 1 }, { unique: true })

module.exports = mongoose.model('Ticket', ticketSchema)
