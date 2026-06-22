const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Place = require('../models/Place')
const Review = require('../models/Review')
const Tag = require('../models/Tag')
const Activity = require('../models/Activity')
const ReviewImageSubmission = require('../models/ReviewImageSubmission')
const DEFAULT_ACTIVITIES = require('../data/defaultActivities')
const bcrypt = require('bcrypt')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { searchPlacesByQuery, getPlaceDetails } = require('../services/goongService')

const normalizePriceText = (input) => String(input || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()

const hasPriceRange = (price) => {
  const normalized = normalizePriceText(price).trim()
  if (!normalized) return false
  return /\b(mien phi|free)\b\s*[-–—]\s*\d/.test(normalized) ||
    /\d[\d\s.,]*(?:k|d|vnd|dong)?\s*[-–—]\s*(?:\d|\b(?:mien phi|free)\b)/.test(normalized)
}

const normalizeTag = (input) => {
  const s = String(input || '').toLowerCase().trim()
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeActivity = normalizeTag

const upsertTags = async (tags) => {
  const list = Array.isArray(tags) ? tags : []
  if (list.length === 0) return
  const ops = []
  for (const t of list) {
    const name = String(t || '').trim()
    if (!name) continue
    const nameNorm = normalizeTag(name)
    if (!nameNorm) continue
    ops.push({
      updateOne: {
        filter: { nameNorm },
        update: { $setOnInsert: { name, nameNorm } },
        upsert: true
      }
    })
  }
  if (ops.length > 0) await Tag.bulkWrite(ops, { ordered: false })
}

const seedDefaultActivitiesIfEmpty = async () => {
  const count = await Activity.countDocuments()
  if (count > 0) return

  await Activity.insertMany(DEFAULT_ACTIVITIES.map(activity => ({
    name: activity.name,
    nameNorm: normalizeActivity(activity.name),
    image: activity.image,
    description: '',
    active: true,
    sortOrder: activity.sortOrder
  })))
}

// Cấu hình multer để upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'place-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'))
    }
  }
})

// Tất cả routes dưới đây yêu cầu đăng nhập và là admin
router.use(authenticate)
router.use(requireAdmin)

// Lấy danh sách tất cả người dùng (không bao gồm admin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password -resetCode -resetExpires')
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('Get users error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách người dùng', details: err.message })
  }
})

// Lấy thông tin một người dùng
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetCode -resetExpires')
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })
    }
    res.json({ success: true, data: user })
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy thông tin người dùng', details: err.message })
  }
})

// Thêm người dùng mới
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, parentName, address, role } = req.body
    
    if (!username || !email || !password || !parentName || !address) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin bắt buộc' })
    }

    // Kiểm tra username hoặc email đã tồn tại
    const existingUser = await User.findOne({ $or: [{ username }, { email }] })
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username hoặc email đã tồn tại' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      parentName,
      address,
      role: role || 'user'
    })

    await newUser.save()
    
    const userResponse = newUser.toObject()
    delete userResponse.password
    
    res.status(201).json({ success: true, message: 'Thêm người dùng thành công', data: userResponse })
  } catch (err) {
    console.error('Create user error:', err)
    res.status(400).json({ success: false, error: 'Lỗi thêm người dùng', details: err.message })
  }
})

// Cập nhật người dùng (không cho đổi mật khẩu)
router.put('/users/:id', async (req, res) => {
  try {
    const { username, email, parentName, address } = req.body
    const user = await User.findById(req.params.id)
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })
    }

    // Không cho cập nhật admin
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Không thể chỉnh sửa tài khoản admin' })
    }

    // Cập nhật các trường nếu có
    if (username) user.username = username
    if (email) user.email = email
    if (parentName) user.parentName = parentName
    if (address) user.address = address

    await user.save()
    
    const userResponse = user.toObject()
    delete userResponse.password
    delete userResponse.resetCode
    delete userResponse.resetExpires
    
    res.json({ success: true, message: 'Cập nhật người dùng thành công', data: userResponse })
  } catch (err) {
    console.error('Update user error:', err)
    res.status(400).json({ success: false, error: 'Lỗi cập nhật người dùng', details: err.message })
  }
})

// Xóa người dùng
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' })
    }

    // Không cho xóa admin
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, error: 'Không thể xóa tài khoản admin' })
    }

    await User.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Xóa người dùng thành công' })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ success: false, error: 'Lỗi xóa người dùng', details: err.message })
  }
})

// ============== QUẢN LÝ ĐỊA ĐIỂM ==============

// ============== QUẢN LÝ HOẠT ĐỘNG THÚ VỊ ==============

router.get('/activities', async (req, res) => {
  try {
    await seedDefaultActivitiesIfEmpty()
    const activities = await Activity.find({}).sort({ sortOrder: 1, name: 1 })
    res.json({ success: true, data: activities })
  } catch (err) {
    console.error('Get activities error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách hoạt động', details: err.message })
  }
})

router.post('/activities', async (req, res) => {
  try {
    const { name, description = '', image = '', active = true, sortOrder = 0 } = req.body || {}
    const trimmedName = String(name || '').trim()
    const nameNorm = normalizeActivity(trimmedName)
    if (!trimmedName || !nameNorm) {
      return res.status(400).json({ success: false, error: 'Tên hoạt động là bắt buộc' })
    }

    const existing = await Activity.findOne({ nameNorm })
    if (existing) {
      return res.status(400).json({ success: false, error: 'Hoạt động này đã tồn tại' })
    }

    const activity = new Activity({
      name: trimmedName,
      nameNorm,
      description: String(description || '').trim(),
      image: String(image || '').trim(),
      active: Boolean(active),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0
    })

    await activity.save()
    res.status(201).json({ success: true, message: 'Thêm hoạt động thành công', data: activity })
  } catch (err) {
    console.error('Create activity error:', err)
    res.status(400).json({ success: false, error: 'Lỗi thêm hoạt động', details: err.message })
  }
})

router.put('/activities/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy hoạt động' })
    }

    const { name, description, image, active, sortOrder } = req.body || {}
    if (name !== undefined) {
      const trimmedName = String(name || '').trim()
      const nameNorm = normalizeActivity(trimmedName)
      if (!trimmedName || !nameNorm) {
        return res.status(400).json({ success: false, error: 'Tên hoạt động là bắt buộc' })
      }
      const duplicate = await Activity.findOne({ nameNorm, _id: { $ne: activity._id } })
      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Hoạt động này đã tồn tại' })
      }
      activity.name = trimmedName
      activity.nameNorm = nameNorm
    }
    if (description !== undefined) activity.description = String(description || '').trim()
    if (image !== undefined) activity.image = String(image || '').trim()
    if (active !== undefined) activity.active = Boolean(active)
    if (sortOrder !== undefined) {
      const order = Number(sortOrder)
      activity.sortOrder = Number.isFinite(order) ? order : 0
    }

    await activity.save()
    res.json({ success: true, message: 'Cập nhật hoạt động thành công', data: activity })
  } catch (err) {
    console.error('Update activity error:', err)
    res.status(400).json({ success: false, error: 'Lỗi cập nhật hoạt động', details: err.message })
  }
})

router.delete('/activities/:id', async (req, res) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id)
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy hoạt động' })
    }
    res.json({ success: true, message: 'Xóa hoạt động thành công' })
  } catch (err) {
    console.error('Delete activity error:', err)
    res.status(500).json({ success: false, error: 'Lỗi xóa hoạt động', details: err.message })
  }
})

// Upload ảnh địa điểm (hỗ trợ nhiều ảnh)
router.post('/tags', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const nameNorm = normalizeTag(name)
    if (!name || !nameNorm) {
      return res.status(400).json({ success: false, error: 'Ten tag la bat buoc' })
    }

    const existing = await Tag.findOne({ nameNorm })
    if (existing) {
      return res.status(400).json({ success: false, error: 'Tag nay da ton tai' })
    }

    const tag = await Tag.create({ name, nameNorm })
    res.status(201).json({ success: true, message: 'Them tag thanh cong', data: tag })
  } catch (err) {
    console.error('Create tag error:', err)
    res.status(400).json({ success: false, error: 'Loi them tag', details: err.message })
  }
})

router.post('/places/upload-image', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có file được upload' })
    }
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`)
    res.json({ success: true, data: { imageUrls } })
  } catch (err) {
    console.error('Upload image error:', err)
    res.status(500).json({ success: false, error: 'Lỗi upload ảnh', details: err.message })
  }
})

// Lấy danh sách tất cả địa điểm
router.get('/places', async (req, res) => {
  try {
    const places = await Place.find().sort({ viewCount: -1, createdAt: -1 })
    res.json({ success: true, data: places })
  } catch (err) {
    console.error('Get places error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách địa điểm', details: err.message })
  }
})

// Lấy thông tin một địa điểm
router.get('/places/:id', async (req, res) => {
  try {
    const place = await Place.findById(req.params.id)
    if (!place) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })
    }
    res.json({ success: true, data: place })
  } catch (err) {
    console.error('Get place error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy thông tin địa điểm', details: err.message })
  }
})

// Thêm địa điểm mới
router.post('/places', async (req, res) => {
  try {
    const { placeId, name, address, openingHours, description, images, types, ageRange, price, parking, food, facilities, tags } = req.body
    
    if (!placeId || !name) {
      return res.status(400).json({ success: false, error: 'placeId và name là bắt buộc' })
    }

    // Kiểm tra placeId đã tồn tại
    if (hasPriceRange(price)) {
      return res.status(400).json({ success: false, error: 'Mỗi địa điểm chỉ có một giá cố định' })
    }

    const existingPlace = await Place.findOne({ placeId })
    if (existingPlace) {
      return res.status(400).json({ success: false, error: 'Địa điểm đã tồn tại' })
    }

    await upsertTags(tags)

    const newPlace = new Place({
      placeId,
      name,
      address,
      openingHours,
      description,
      images: images || [],
      types,
      ageRange: ageRange || '0-12',
      price: price || 'Miễn phí',
      parking: parking || '',
      food: food || '',
      facilities: facilities || '',
      tags: tags || [],
      viewCount: 0
    })

    await newPlace.save()
    
    res.status(201).json({ success: true, message: 'Thêm địa điểm thành công', data: newPlace })
  } catch (err) {
    console.error('Create place error:', err)
    res.status(400).json({ success: false, error: 'Lỗi thêm địa điểm', details: err.message })
  }
})

// Cập nhật địa điểm
router.put('/places/:id', async (req, res) => {
  try {
    const { name, address, openingHours, description, images, types, ageRange, price, parking, food, facilities, tags } = req.body
    const place = await Place.findById(req.params.id)
    
    if (!place) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })
    }

    // Cập nhật các trường nếu có
    if (price !== undefined && hasPriceRange(price)) {
      return res.status(400).json({ success: false, error: 'Mỗi địa điểm chỉ có một giá cố định' })
    }

    if (name) place.name = name
    if (address !== undefined) place.address = address
    if (openingHours !== undefined) place.openingHours = openingHours
    if (description !== undefined) place.description = description
    if (images !== undefined) place.images = images
    if (types !== undefined) place.types = types
    if (ageRange !== undefined) place.ageRange = ageRange
    if (price !== undefined) place.price = price
    if (parking !== undefined) place.parking = parking
    if (food !== undefined) place.food = food
    if (facilities !== undefined) place.facilities = facilities
    if (tags !== undefined) place.tags = tags

    if (tags !== undefined) {
      await upsertTags(tags)
    }

    await place.save()
    
    res.json({ success: true, message: 'Cập nhật địa điểm thành công', data: place })
  } catch (err) {
    console.error('Update place error:', err)
    res.status(400).json({ success: false, error: 'Lỗi cập nhật địa điểm', details: err.message })
  }
})

// ============== DUYỆT ẢNH ĐÁNH GIÁ (REVIEW IMAGE SUBMISSIONS) ==============

// List review image submissions (default: pending)
router.get('/review-image-submissions', async (req, res) => {
  try {
    const { status = 'pending', limit = 50 } = req.query
    const query = {}
    if (status) query.status = status

    const submissions = await ReviewImageSubmission.find(query)
      .populate('place', 'name address')
      .populate('submittedBy', 'username email parentName')
      .populate('review', 'rating comment')
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit) || 50, 200))

    res.json({ success: true, data: submissions })
  } catch (err) {
    console.error('Get review image submissions error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách ảnh đánh giá chờ duyệt', details: err.message })
  }
})

// Approve a review image: mark approved + add to Review.images
router.post('/review-image-submissions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params
    const submission = await ReviewImageSubmission.findById(id)
    if (!submission) return res.status(404).json({ success: false, error: 'Không tìm thấy ảnh chờ duyệt' })
    if (submission.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Ảnh này đã được xử lý trước đó' })
    }

    const review = await Review.findById(submission.review)
    if (!review) return res.status(404).json({ success: false, error: 'Không tìm thấy đánh giá' })

    if (!Array.isArray(review.images)) review.images = []
    if (!review.images.includes(submission.imageUrl) && review.images.length >= 3) {
      return res.status(400).json({ success: false, error: 'Đánh giá này đã đủ 3 ảnh' })
    }
    if (!review.images.includes(submission.imageUrl)) {
      review.images.push(submission.imageUrl)
    }
    await review.save()

    submission.status = 'approved'
    submission.rejectionReason = ''
    submission.reviewedBy = req.user._id
    submission.reviewedAt = new Date()
    await submission.save()

    res.json({ success: true, message: 'Đã phê duyệt ảnh đánh giá', data: submission })
  } catch (err) {
    console.error('Approve review image submission error:', err)
    res.status(500).json({ success: false, error: 'Lỗi phê duyệt ảnh đánh giá', details: err.message })
  }
})

// Reject a review image
router.post('/review-image-submissions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params
    const { reason = '' } = req.body || {}

    const submission = await ReviewImageSubmission.findById(id)
    if (!submission) return res.status(404).json({ success: false, error: 'Không tìm thấy ảnh chờ duyệt' })
    if (submission.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Ảnh này đã được xử lý trước đó' })
    }

    submission.status = 'rejected'
    submission.rejectionReason = String(reason || '')
    submission.reviewedBy = req.user._id
    submission.reviewedAt = new Date()
    await submission.save()

    // Best-effort delete file from disk
    try {
      const filename = path.basename(submission.imageUrl || '')
      if (filename) {
        const filePath = path.join(__dirname, '..', 'uploads', 'reviews', filename)
        await fs.promises.unlink(filePath)
      }
    } catch (e) {
      // ignore
    }

    res.json({ success: true, message: 'Đã từ chối ảnh đánh giá', data: submission })
  } catch (err) {
    console.error('Reject review image submission error:', err)
    res.status(500).json({ success: false, error: 'Lỗi từ chối ảnh đánh giá', details: err.message })
  }
})

// Xóa địa điểm
router.delete('/places/:id', async (req, res) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id)
    
    if (!place) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })
    }

    res.json({ success: true, message: 'Xóa địa điểm thành công' })
  } catch (err) {
    console.error('Delete place error:', err)
    res.status(500).json({ success: false, error: 'Lỗi xóa địa điểm', details: err.message })
  }
})

// ============ TÌM KIẾM TỪ GOONG API ============

// Tìm kiếm địa điểm từ Goong API (không trong database)
router.get('/search-goong', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim()
    if (!query) {
      return res.status(400).json({ success: false, error: 'Thiếu từ khóa tìm kiếm' })
    }

    // Tìm từ Goong API
    const goongResults = await searchPlacesByQuery(query, 20)
    const uniqueGoongResults = []
    const seenGoongPlaceIds = new Set()
    for (const place of goongResults) {
      const placeId = place.placeId || place.id
      if (!placeId || seenGoongPlaceIds.has(placeId)) continue
      seenGoongPlaceIds.add(placeId)
      uniqueGoongResults.push({ ...place, placeId })
    }
    
    // Lấy danh sách placeId đã có trong database
    const existingPlaces = await Place.find(
      { placeId: { $in: uniqueGoongResults.map(p => p.placeId) } },
      'placeId'
    ).lean()
    const existingPlaceIds = new Set(existingPlaces.map(p => p.placeId))
    
    // Lọc ra những địa điểm chưa có trong database
    const newPlaces = uniqueGoongResults.filter(p => !existingPlaceIds.has(p.placeId))
    
    res.json({ success: true, data: newPlaces })
  } catch (err) {
    console.error('Search Goong error:', err)
    res.status(500).json({ success: false, error: 'Lỗi tìm kiếm từ Goong', details: err.message })
  }
})

// Thêm địa điểm từ kết quả Goong vào database
router.post('/places/add-from-goong', async (req, res) => {
  try {
    const { placeId, name, ageMin, ageMax, price, tags } = req.body
    
    if (!placeId || !name) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin bắt buộc' })
    }

    // Kiểm tra đã tồn tại chưa
    if (hasPriceRange(price)) {
      return res.status(400).json({ success: false, error: 'Mỗi địa điểm chỉ có một giá cố định' })
    }

    const existing = await Place.findOne({ placeId })
    if (existing) {
      return res.status(400).json({ success: false, error: 'Địa điểm đã tồn tại trong database' })
    }

    // Lấy chi tiết từ Goong API
    let placeDetails = {}
    try {
      placeDetails = await getPlaceDetails(placeId)
    } catch (e) {
      console.warn('Could not get place details:', e.message)
    }

    const ageRange = `${ageMin || 0}-${ageMax || 12}`
    await upsertTags(tags)
    
    const newPlace = new Place({
      placeId,
      name,
      address: placeDetails.address || '',
      lat: placeDetails.lat || null,
      lng: placeDetails.lng || null,
      phone: placeDetails.phone || '',
      website: placeDetails.website || '',
      openingHours: placeDetails.openingHours || [],
      types: placeDetails.types || [],
      ageRange,
      price: price || 'Miễn phí',
      tags: tags || [],
      images: [],
      rating: placeDetails.rating || 0
    })

    await newPlace.save()
    
    res.json({ success: true, message: 'Thêm địa điểm thành công', data: newPlace })
  } catch (err) {
    console.error('Add place from Goong error:', err)
    res.status(400).json({ success: false, error: 'Lỗi thêm địa điểm', details: err.message })
  }
})

module.exports = router
