const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Review = require('../models/Review')
const Place = require('../models/Place')
const ReviewImageSubmission = require('../models/ReviewImageSubmission')
const { authenticate, verifyAuthToken } = require('../middleware/auth')
const { createUserNotification } = require('../services/notificationService')
const multer = require('multer')
const { uploadBuffer } = require('../services/cloudinaryService')

async function getOptionalUser(req) {
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return null
    const token = authHeader.split(' ')[1]
    return await verifyAuthToken(token)
  } catch {
    return null
  }
}

// Cấu hình multer cho upload ảnh review (lưu tạm trong bộ nhớ rồi đẩy lên Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
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
// Lay cac danh gia moi nhat de hien thi trang chu
router.get('/latest/public', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '4', 10), 8)
    const reviews = await Review.find({ comment: { $exists: true, $ne: '' } })
      .populate('user', 'username parentName avatar')
      .populate('place', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    res.json({
      success: true,
      data: reviews.map(review => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: review.user,
        place: review.place
      }))
    })
  } catch (err) {
    console.error('Get latest reviews error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy đánh giá mới nhất' })
  }
})

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

    // Tạo review mới
    const review = new Review({
      place: placeId,
      user: userId,
      rating: parseInt(rating),
      comment,
      images: [],
      likedBy: [],
      dislikedBy: []
    })
    await review.save()

    // Tạo submissions cho ảnh review (chờ admin duyệt)
    if (req.files && req.files.length > 0) {
      const uploaded = await Promise.all(
        req.files.map(f => uploadBuffer(f.buffer, 'theweekend/reviews'))
      )
      const submissions = uploaded.map((result, i) => ({
        review: review._id,
        place: placeId,
        submittedBy: userId,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        originalName: req.files[i].originalname || ''
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
    await createUserNotification(userId, {
      type: 'success',
      title: 'Đã gửi đánh giá',
      message: hasPendingImages
        ? `Đánh giá của bạn về ${place.name} đã được gửi. Ảnh sẽ hiển thị sau khi được duyệt.`
        : `Đánh giá của bạn về ${place.name} đã được gửi thành công.`
    })
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
        .filter(u => typeof u === 'string' && (u.startsWith('/uploads/') || /^https?:\/\//.test(u)))
        .slice(0, 3)
    }

    // Ảnh mới chỉ tạo submission chờ duyệt; Review.images chỉ chứa ảnh đã duyệt.
    if (req.files && req.files.length > 0) {
      const currentApproved = Array.isArray(review.images) ? review.images.length : 0
      const remaining = Math.max(0, 3 - currentApproved)
      const filesToUpload = req.files.slice(0, remaining)
      const uploaded = await Promise.all(
        filesToUpload.map(f => uploadBuffer(f.buffer, 'theweekend/reviews'))
      )
      const submissions = uploaded.map((result, i) => ({
        review: review._id,
        place: review.place,
        submittedBy: review.user,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        originalName: filesToUpload[i].originalname || ''
      }))
      if (submissions.length > 0) await ReviewImageSubmission.insertMany(submissions)
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
    const place = await Place.findById(review.place).select('name').lean()
    await createUserNotification(review.user, {
      type: 'success',
      title: 'Đã cập nhật đánh giá',
      message: hasPendingImages
        ? `Đánh giá của bạn về ${place?.name || 'địa điểm'} đã được cập nhật. Ảnh mới sẽ hiển thị sau khi được duyệt.`
        : `Đánh giá của bạn về ${place?.name || 'địa điểm'} đã được cập nhật.`
    })
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
    const reviewOwner = review.user
    const deletedReviewPlace = await Place.findById(placeId).select('name').lean()
    await review.deleteOne()

    // Cập nhật rating trung bình của place
    const avgResult = await Review.aggregate([
      { $match: { place: placeId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ])
    const newRating = avgResult.length > 0 ? Math.round(avgResult[0].avgRating * 10) / 10 : 0
    await Place.findByIdAndUpdate(placeId, { rating: newRating })
    await createUserNotification(reviewOwner, {
      type: 'info',
      title: 'Đã xóa đánh giá',
      message: `Đánh giá của bạn về ${deletedReviewPlace?.name || 'địa điểm'} đã được xóa.`
    })

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
    const reviewOwnerId = review.user.toString()
    if (myReaction && reviewOwnerId !== userId) {
      const place = await Place.findById(review.place).select('name').lean()
      await createUserNotification(review.user, {
        type: 'info',
        title: myReaction === 'like' ? 'Đánh giá có lượt thích mới' : 'Đánh giá có phản hồi mới',
        message: `${req.user.parentName || req.user.username || 'Một người dùng'} đã ${myReaction === 'like' ? 'thích' : 'không thích'} đánh giá của bạn về ${place?.name || 'địa điểm'}.`
      })
    }
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
