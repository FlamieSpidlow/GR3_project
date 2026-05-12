const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  place: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  images: [{ type: String }], // Ảnh đánh giá (nếu có)
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })

// Index for faster queries (not unique - allow multiple reviews)
reviewSchema.index({ place: 1 })
reviewSchema.index({ user: 1 })

module.exports = mongoose.model('Review', reviewSchema)
