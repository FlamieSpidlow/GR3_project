const mongoose = require('mongoose')

const reviewImageSubmissionSchema = new mongoose.Schema({
  review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
  place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  publicId: { type: String, default: '' },
  originalName: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true })

reviewImageSubmissionSchema.index({ review: 1, createdAt: -1 })
reviewImageSubmissionSchema.index({ place: 1, createdAt: -1 })
reviewImageSubmissionSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('ReviewImageSubmission', reviewImageSubmissionSchema)
