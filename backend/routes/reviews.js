const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Review = require('../models/Review')
const Place = require('../models/Place')
const ReviewImageSubmission = require('../models/ReviewImageSubmission')
const { authenticate } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const User = require('../models/User')

async function getOptionalUser(req) {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return null
    const token = authHeader.split(' ')[1]
    if (!token || !token.startsWith('token_')) return null
    const userId = token.slice(6)
    if (!userId) return null
    return await User.findById(userId)
  } catch {
    return null
  }
}

// Cấu hình multer cho upload ảnh review
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync('uploads/reviews/', { recursive: true })
    } catch (e) {
      // ignore
    }
    cb(null, 'uploads/reviews/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh'), false)
    }
  }
})

// Lấy danh sách đánh giá của một địa điểm
router.get('/place/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params
    const { page = 1, limit = 10 } = req.query

    const optionalUser = await getOptionalUser(req)

    const reviews = await Review.find({ place: placeId })
      .populate('user', 'username avatar parentName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))

    const total = await Review.countDocuments({ place: placeId })

    // Tính rating trung bình
    const avgResult = await Review.aggregate([
      { $match: { place: new mongoose.Types.ObjectId(placeId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ])

    const avgRating = avgResult.length > 0 ? avgResult[0].avgRating : 0
    const reviewCount = avgResult.length > 0 ? avgResult[0].count : 0

    const mappedReviews = reviews.map(r => {
      const likedBy = Array.isArray(r.likedBy) ? r.likedBy : []
      const dislikedBy = Array.isArray(r.dislikedBy) ? r.dislikedBy : []
      let myReaction = null
      if (optionalUser) {
        const uid = optionalUser._id.toString()
        if (likedBy.some(x => x.toString() === uid)) myReaction = 'like'
        else if (dislikedBy.some(x => x.toString() === uid)) myReaction = 'dislike'
      }
      return {
        ...r.toObject(),
        likeCount: likedBy.length,
        dislikeCount: dislikedBy.length,
        myReaction
      }
    })

    res.json({
      success: true,
      data: {
        reviews: mappedReviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats: {
          avgRating: Math.round(avgRating * 10) / 10,
          reviewCount
        }
      }
    })
  } catch (err) {
    console.error('Get reviews error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách đánh giá' })
  }
})

// Tạo đánh giá mới (cần đăng nhập)
router.post('/', authenticate, upload.array('images', 3), async (req, res) => {
  try {
    const { placeId, rating, comment } = req.body
    const userId = req.user._id

    if (!placeId || !rating || !comment) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin' })
    }

    // Kiểm tra place có tồn tại không
    const place = await Place.findById(placeId)
    if (!place) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })
    }

    // Ảnh upload: hiển thị ngay trong review, nhưng vẫn tạo submission để admin có thể từ chối
    const images = req.files ? req.files.map(f => `/uploads/reviews/${f.filename}`) : []

    // Tạo review mới
    const review = new Review({
      place: placeId,
      user: userId,
      rating: parseInt(rating),
      comment,
      images,
      likedBy: [],
      dislikedBy: []
    })
    await review.save()

    // Tạo submissions cho ảnh review (chờ admin duyệt)
    if (req.files && req.files.length > 0) {
      const submissions = req.files.map(f => ({
        review: review._id,
        place: placeId,
        submittedBy: userId,
        imageUrl: `/uploads/reviews/${f.filename}`,
        originalName: f.originalname || ''
      }))
      await ReviewImageSubmission.insertMany(submissions)
    }

    // Cập nhật rating trung bình của place
    const avgResult = await Review.aggregate([
      { $match: { place: new mongoose.Types.ObjectId(placeId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ])
    if (avgResult.length > 0) {
      place.rating = Math.round(avgResult[0].avgRating * 10) / 10
      await place.save()
    }

    // Populate user info để trả về
    await review.populate('user', 'username avatar parentName')

    const hasPendingImages = !!(req.files && req.files.length > 0)
    res.json({
      success: true,
      data: review,
      message: hasPendingImages ? 'Đánh giá thành công. Ảnh sẽ hiển thị sau khi được duyệt.' : 'Đánh giá thành công'
    })
  } catch (err) {
    console.error('Create review error:', err)
    res.status(500).json({ success: false, error: 'Lỗi tạo đánh giá' })
  }
})

// Cập nhật đánh giá (cần đăng nhập, chỉ owner)
router.put('/:reviewId', authenticate, upload.array('images', 3), async (req, res) => {
  try {
    const { reviewId } = req.params
    const { rating, comment, keepImages } = req.body
    const userId = req.user._id.toString()

    const review = await Review.findById(reviewId)
    if (!review) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đánh giá' })
    }

    // Kiểm tra quyền sở hữu
    if (review.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền sửa đánh giá này' })
    }

    // Cập nhật
    if (rating) review.rating = parseInt(rating)
    if (comment) review.comment = comment

    // Cho phép giữ/xóa ảnh hiện có (URL strings)
    if (keepImages !== undefined) {
      let parsed = []
      try {
        parsed = Array.isArray(keepImages) ? keepImages : JSON.parse(keepImages)
      } catch {
        parsed = []
      }
      if (!Array.isArray(parsed)) parsed = []
      review.images = parsed
        .filter(u => typeof u === 'string' && u.startsWith('/uploads/'))
        .slice(0, 3)
    }

    // Ảnh mới: hiển thị ngay trong review.images (tối đa 3) và tạo submission chờ duyệt
    if (req.files && req.files.length > 0) {
      const newUrls = req.files.map(f => `/uploads/reviews/${f.filename}`)
      const currentUrls = Array.isArray(review.images) ? review.images : []
      const remaining = Math.max(0, 3 - currentUrls.length)
      review.images = currentUrls.concat(newUrls.slice(0, remaining)).slice(0, 3)

      const submissions = req.files.map(f => ({
        review: review._id,
        place: review.place,
        submittedBy: review.user,
        imageUrl: `/uploads/reviews/${f.filename}`,
        originalName: f.originalname || ''
      }))
      await ReviewImageSubmission.insertMany(submissions)
    }
    await review.save()

    // Cập nhật rating trung bình của place
    const avgResult = await Review.aggregate([
      { $match: { place: review.place } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ])
    if (avgResult.length > 0) {
      await Place.findByIdAndUpdate(review.place, { 
        rating: Math.round(avgResult[0].avgRating * 10) / 10 
      })
    }

    await review.populate('user', 'username avatar parentName')

    const hasPendingImages = !!(req.files && req.files.length > 0)
    res.json({
      success: true,
      data: review,
      message: hasPendingImages ? 'Cập nhật đánh giá thành công. Ảnh sẽ hiển thị sau khi được duyệt.' : 'Cập nhật đánh giá thành công'
    })
  } catch (err) {
    console.error('Update review error:', err)
    res.status(500).json({ success: false, error: 'Lỗi cập nhật đánh giá' })
  }
})

// Lấy danh sách ảnh review mà user hiện tại đã gửi cho review này
router.get('/:reviewId/image-submissions/me', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params
    const userId = req.user._id

    const submissions = await ReviewImageSubmission.find({ review: reviewId, submittedBy: userId })
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({ success: true, data: submissions })
  } catch (err) {
    console.error('Get review image submissions error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách ảnh đã gửi' })
  }
})

// Xóa đánh giá (cần đăng nhập, chỉ owner hoặc admin)
router.delete('/:reviewId', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params
    const userId = req.user._id.toString()
    const userRole = req.user.role

    const review = await Review.findById(reviewId)
    if (!review) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đánh giá' })
    }

    // Kiểm tra quyền (owner hoặc admin)
    if (review.user.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền xóa đánh giá này' })
    }

    const placeId = review.place
    await review.deleteOne()

    // Cập nhật rating trung bình của place
    const avgResult = await Review.aggregate([
      { $match: { place: placeId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ])
    const newRating = avgResult.length > 0 ? Math.round(avgResult[0].avgRating * 10) / 10 : 0
    await Place.findByIdAndUpdate(placeId, { rating: newRating })

    res.json({ success: true, message: 'Xóa đánh giá thành công' })
  } catch (err) {
    console.error('Delete review error:', err)
    res.status(500).json({ success: false, error: 'Lỗi xóa đánh giá' })
  }
})

// Like/Dislike một đánh giá
router.post('/:reviewId/reaction', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params
    const { action } = req.body || {}
    const userId = req.user._id.toString()

    const review = await Review.findById(reviewId)
    if (!review) return res.status(404).json({ success: false, error: 'Không tìm thấy đánh giá' })

    if (!Array.isArray(review.likedBy)) review.likedBy = []
    if (!Array.isArray(review.dislikedBy)) review.dislikedBy = []

    const likedSet = new Set(review.likedBy.map(x => x.toString()))
    const dislikedSet = new Set(review.dislikedBy.map(x => x.toString()))

    if (action === 'like') {
      likedSet.add(userId)
      dislikedSet.delete(userId)
    } else if (action === 'dislike') {
      dislikedSet.add(userId)
      likedSet.delete(userId)
    } else if (action === 'clear') {
      likedSet.delete(userId)
      dislikedSet.delete(userId)
    } else {
      return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' })
    }

    review.likedBy = Array.from(likedSet)
    review.dislikedBy = Array.from(dislikedSet)
    await review.save()

    const myReaction = likedSet.has(userId) ? 'like' : (dislikedSet.has(userId) ? 'dislike' : null)
    res.json({
      success: true,
      data: {
        likeCount: review.likedBy.length,
        dislikeCount: review.dislikedBy.length,
        myReaction
      }
    })
  } catch (err) {
    console.error('React review error:', err)
    res.status(500).json({ success: false, error: 'Lỗi xử lý cảm xúc đánh giá' })
  }
})

module.exports = router
