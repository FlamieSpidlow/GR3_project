const express = require('express')
const router = express.Router()
const { searchPlacesByQuery, searchPlacesByQueryWithDistance, searchNearbyPlaygrounds, getPlaceDetails, reverseGeocode } = require('../services/goongService')
const Place = require('../models/Place')
const Tag = require('../models/Tag')
const PlaceImageSubmission = require('../models/PlaceImageSubmission')
const { authenticate } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')

// Upload config for user-submitted place images (pending approval)
const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const placeId = (req.params && req.params.id) ? String(req.params.id) : 'unknown'
    cb(null, `submission-${placeId}-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

const submissionUpload = multer({
  storage: submissionStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) return cb(null, true)
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'))
  }
})

// Lấy tất cả địa điểm từ database
router.get('/all', async (req, res) => {
  try {
    const places = await Place.find({}).sort({ viewCount: -1, createdAt: -1 })
    
    const results = places.map(place => ({
      id: place._id.toString(),
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      rating: place.rating,
      image: place.images && place.images.length > 0 ? place.images[0] : place.image,
      images: place.images || (place.image ? [place.image] : []),
      ageRange: place.ageRange,
      price: place.price,
      description: place.description,
      openingHours: place.openingHours,
      parking: place.parking,
      food: place.food,
      facilities: place.facilities,
      tags: place.tags || [],
      source: 'database'
    }))
    
    res.json({ success: true, data: results })
  } catch (err) {
    console.error('Get all places error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách địa điểm', details: err.message })
  }
})

// ============== USER SUBMITTED PLACE IMAGES (PENDING APPROVAL) ==============

// User submits images for a place (admin must approve)
router.post('/:id/images/submissions', authenticate, submissionUpload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.status(400).json({ success: false, error: 'Place id is required' })
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có file được upload' })
    }

    const place = await Place.findById(id)
    if (!place) return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })

    const created = await PlaceImageSubmission.insertMany(
      req.files.map(file => ({
        place: place._id,
        submittedBy: req.user._id,
        imageUrl: `/uploads/${file.filename}`,
        originalName: file.originalname || ''
      }))
    )

    res.json({ success: true, message: 'Đã gửi ảnh, chờ quản trị viên phê duyệt', data: created })
  } catch (err) {
    console.error('Submit place images error:', err)
    res.status(500).json({ success: false, error: 'Lỗi gửi ảnh địa điểm', details: err.message })
  }
})

// Get my submissions for a place (optional UX)
router.get('/:id/images/submissions/me', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const place = await Place.findById(id).select('_id')
    if (!place) return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })

    const submissions = await PlaceImageSubmission.find({
      place: place._id,
      submittedBy: req.user._id
    }).sort({ createdAt: -1 })

    res.json({ success: true, data: submissions })
  } catch (err) {
    console.error('Get my submissions error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách ảnh đã gửi', details: err.message })
  }
})

// Lấy địa điểm ngẫu nhiên từ database (cho trang chủ)
router.get('/random', async (req, res) => {
  try {
    const { limit = 4 } = req.query
    const limitNum = parseInt(limit)
    
    // Lấy ngẫu nhiên từ database bằng aggregation
    const randomPlaces = await Place.aggregate([
      { $sample: { size: limitNum } }
    ])
    
    // Map to consistent format
    const results = randomPlaces.map(place => ({
      id: place._id.toString(),
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      rating: place.rating,
      image: place.images && place.images.length > 0 ? place.images[0] : place.image,
      images: place.images || (place.image ? [place.image] : []),
      ageRange: place.ageRange,
      price: place.price,
      description: place.description,
      openingHours: place.openingHours,
      parking: place.parking,
      food: place.food,
      facilities: place.facilities,
      tags: place.tags || [],
      source: 'database'
    }))
    
    res.json({ success: true, data: results })
  } catch (err) {
    console.error('Random places error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy địa điểm ngẫu nhiên', details: err.message })
  }
})

// Search places by name or keyword (kết hợp database và Goong API)
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 10, age } = req.query
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' })
    }

    const { lat, lng } = req.query
    const limitNum = parseInt(limit)
    const ageFromParam = age ? parseInt(age) : null

    // =========================
    // Refactor search pipeline
    // - Normalize query (lowercase + bỏ dấu)
    // - Extract intent: tags + age (từ query text hoặc query param)
    // - Filter trước trong Mongo query (không filter sau)
    // - 1 Mongo query duy nhất
    // - Scoring + sort 1 lần theo score
    // =========================

    const normalizeText = (input) => {
      const s = String(input || '').toLowerCase().trim()
      return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const extractAgeFromText = (normalized) => {
      // Examples: "5 tuoi", "tuoi 5", "5t"
      const m1 = normalized.match(/\b(\d{1,2})\s*(tuoi|t)\b/)
      if (m1) return parseInt(m1[1])
      const m2 = normalized.match(/\btuoi\s*(\d{1,2})\b/)
      if (m2) return parseInt(m2[1])
      return null
    }

    const rawQuery = String(query || '').trim()
    const normalizedQuery = normalizeText(rawQuery)

    // age priority: explicit param > extracted from query text
    const extractedAge = extractAgeFromText(normalizedQuery)
    const ageFilter = Number.isFinite(ageFromParam) ? ageFromParam : extractedAge

    const userLat = lat != null ? parseFloat(lat) : null
    const userLng = lng != null ? parseFloat(lng) : null
    
    // Mapping từ khóa phổ biến đến tag tương ứng
    const keywordToTag = {
      // Bơi lội
      'bơi': 'Bơi lội', 'boi': 'Bơi lội', 'swim': 'Bơi lội', 'hồ bơi': 'Bơi lội', 'bể bơi': 'Bơi lội',
      // Picnic
      'picnic': 'Picnic', 'pic nic': 'Picnic',
      // Leo núi
      'leo núi': 'Leo núi', 'leo nui': 'Leo núi', 'trekking': 'Leo núi', 'hiking': 'Leo núi',
      // Trong nhà
      'trong nhà': 'Trong nhà', 'trong nha': 'Trong nhà', 'indoor': 'Trong nhà',
      // Ngoài trời
      'ngoài trời': 'Ngoài trời', 'ngoai troi': 'Ngoài trời', 'outdoor': 'Ngoài trời',
      // Vận động
      'vận động': 'Vận động', 'van dong': 'Vận động', 'thể thao': 'Vận động', 'sport': 'Vận động',
      // Chụp ảnh / Check-in
      'chụp ảnh': 'Chụp ảnh', 'chup anh': 'Chụp ảnh', 'check-in': 'Check-in', 'checkin': 'Check-in', 'sống ảo': 'Check-in',
      // Công viên
      'công viên': 'Công viên', 'cong vien': 'Công viên', 'park': 'Công viên',
      // Giải trí
      'giải trí': 'Giải trí', 'giai tri': 'Giải trí', 'vui chơi': 'Giải trí',
      // Gia đình
      'gia đình': 'Gia đình', 'gia dinh': 'Gia đình', 'family': 'Gia đình',
      // Trẻ em (đã bỏ tag "Trẻ em" theo yêu cầu)
      // Cuối tuần
      'cuối tuần': 'Cuối tuần', 'cuoi tuan': 'Cuối tuần', 'weekend': 'Cuối tuần',
      // Sinh thái
      'sinh thái': 'Sinh thái', 'sinh thai': 'Sinh thái', 'eco': 'Sinh thái', 'thiên nhiên': 'Sinh thái',
      // Thư giãn
      'thư giãn': 'Thư giãn', 'thu gian': 'Thư giãn', 'relax': 'Thư giãn', 'nghỉ ngơi': 'Thư giãn',
      // Gần Hà Nội
      'gần hà nội': 'Gần Hà Nội', 'gan ha noi': 'Gần Hà Nội', 'ngoại thành': 'Gần Hà Nội',

      // Động vật / Thú / Sở thú
      'động vật': 'Động vật', 'dong vat': 'Động vật',
      'animal': 'Động vật', 'animals': 'Động vật',
      'thú': 'Chăm sóc thú', 'thu': 'Chăm sóc thú',
      'sở thú': 'Chăm sóc thú', 'so thu': 'Chăm sóc thú', 'zoo': 'Chăm sóc thú',
      'pet': 'Chăm sóc thú', 'pets': 'Chăm sóc thú',

      // Nhà bóng
      'nhà bóng': 'Nhà bóng', 'nha bong': 'Nhà bóng', 'ball pit': 'Nhà bóng', 'ballpool': 'Nhà bóng', 'ball pool': 'Nhà bóng',

      // Nông trại
      'nông trại': 'Nông trại', 'nong trai': 'Nông trại', 'farm': 'Nông trại', 'farmer': 'Nông trại',
      // Đồ thủ công / Truyền thống
      'đồ thủ công': 'Đồ thủ công', 'do thu cong': 'Đồ thủ công', 'thủ công': 'Đồ thủ công', 'thu cong': 'Đồ thủ công', 'handicraft': 'Đồ thủ công', 'handmade': 'Đồ thủ công',
      'truyền thống': 'Truyền thống', 'truyen thong': 'Truyền thống', 'traditional': 'Truyền thống'
      ,
      // Lịch sử / Văn hóa
      'lịch sử': 'Lịch sử', 'lich su': 'Lịch sử', 'history': 'Lịch sử',
      'văn hóa': 'Văn hóa', 'van hoa': 'Văn hóa', 'culture': 'Văn hóa', 'cultural': 'Văn hóa'
    }
    // Tìm tag từ keyword trong query (dựa trên normalizedQuery để bỏ dấu)
    let matchedTags = []
    for (const [keyword, tag] of Object.entries(keywordToTag)) {
      if (normalizedQuery.includes(normalizeText(keyword))) {
        if (!matchedTags.includes(tag)) matchedTags.push(tag)
      }
    }

    if (matchedTags.length > 0) {
      const tagDocs = await Tag.find({}, { name: 1, nameNorm: 1 }).lean()
      const allowed = new Set(tagDocs.map(t => normalizeText(t.name)))
      matchedTags = matchedTags.filter(t => allowed.has(normalizeText(t)))
    }

    // FILTER TRƯỚC trong Mongo query
    // Lưu ý: schema hiện tại lưu tuổi dưới dạng ageRange (vd: "3-10").
    // Để đáp ứng yêu cầu "filter trước" mà không thay đổi schema, dùng $expr để parse ageRange.
    const andClauses = []
    if (Number.isFinite(ageFilter)) {
      andClauses.push({
        $or: [
          { ageRange: { $exists: false } },
          { ageRange: null },
          { ageRange: '' },
          {
            $expr: {
              $let: {
                vars: {
                  parts: {
                    $split: [
                      { $ifNull: ['$ageRange', ''] },
                      '-'
                    ]
                  }
                },
                in: {
                  $and: [
                    { $gte: [{ $size: '$$parts' }, 2] },
                    {
                      $lte: [
                        { $toInt: { $trim: { input: { $arrayElemAt: ['$$parts', 0] } } } },
                        ageFilter
                      ]
                    },
                    {
                      $gte: [
                        { $toInt: { $trim: { input: { $arrayElemAt: ['$$parts', 1] } } } },
                        ageFilter
                      ]
                    }
                  ]
                }
              }
            }
          }
        ]
      })
    }

    // 1 query MongoDB duy nhất với $or theo spec
    const safeRegex = escapeRegex(rawQuery)
    const orClauses = [
      { name: { $regex: safeRegex, $options: 'i' } },
      { address: { $regex: safeRegex, $options: 'i' } },
      { description: { $regex: safeRegex, $options: 'i' } }
    ]

    if (matchedTags.length > 0) {
      andClauses.push({ tags: { $in: matchedTags } })
      andClauses.push({ $or: orClauses })
    } else {
      andClauses.push({ $or: [...orClauses, { tags: { $in: matchedTags } }] })
    }
    const mongoFilter = andClauses.length > 1 ? { $and: andClauses } : andClauses[0]

    const dbPlaces = await Place.find(mongoFilter).lean()
    console.log(`Database search for "${rawQuery}" (age=${ageFilter ?? 'n/a'}, tags=${matchedTags.join(', ') || 'n/a'}): found ${dbPlaces.length} places`)

    const matchedTagsNorm = matchedTags.map(t => normalizeText(t))

    const calculateScore = (place, ctx) => {
      // +5 nếu match tag
      // +3 nếu name match query
      // * điểm khoảng cách (nếu có lat/lng)  -> dùng factor nhẹ để không "đè" relevance
      // * log(viewCount + 1)
      // * rating * 2
      const placeNameNorm = normalizeText(place.name)
      const placeTagsNorm = (place.tags || []).map(t => normalizeText(t))

      let score = 1
      const tagMatched = matchedTagsNorm.length > 0 && matchedTagsNorm.some(t => placeTagsNorm.includes(t))
      if (tagMatched) score += 5
      if (ctx.normalizedQuery && placeNameNorm.includes(ctx.normalizedQuery)) score += 3

      // distance factor: 1..~2 (nearer => higher)
      if (ctx.userLat != null && ctx.userLng != null && place.lat != null && place.lng != null) {
        const d = calculateDistance(ctx.userLat, ctx.userLng, place.lat, place.lng)
        const km = d / 1000
        score *= (1 + (1 / (1 + km)))
      }

      const vc = Math.max(0, Number(place.viewCount || 0))
      score *= (Math.log(vc + 1) + 1) // +1 để tránh nhân 0 khi viewCount=0

      const rating = Math.max(0, Number(place.rating || 0))
      score *= (rating * 2 + 1) // +1 để tránh nhân 0 khi rating=0

      return score
    }

    // Map + compute distance + score
    const ctx = { normalizedQuery, userLat: Number.isFinite(userLat) ? userLat : null, userLng: Number.isFinite(userLng) ? userLng : null }

    const scored = dbPlaces.map(place => {
      let distance = null
      if (ctx.userLat != null && ctx.userLng != null && place.lat != null && place.lng != null) {
        distance = calculateDistance(ctx.userLat, ctx.userLng, place.lat, place.lng)
      }

      const score = calculateScore(place, ctx)

      return {
        id: place._id.toString(),
        placeId: place.placeId,
        name: place.name,
        mainText: place.name,
        secondaryText: place.address || '',
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        image: place.images && place.images.length > 0 ? place.images[0] : place.image,
        images: place.images || (place.image ? [place.image] : []),
        ageRange: place.ageRange,
        price: place.price,
        description: place.description,
        openingHours: place.openingHours,
        parking: place.parking,
        food: place.food,
        facilities: place.facilities,
        tags: place.tags || [],
        source: 'database',
        hasImage: (place.images && place.images.length > 0) || !!place.image,
        distance,
        _score: score
      }
    })

    // Sort DUY NHẤT 1 LẦN theo score (desc)
    scored.sort((a, b) => (b._score || 0) - (a._score || 0))

    // Limit kết quả
    const finalResults = scored.slice(0, limitNum).map(({ _score, ...rest }) => rest)

    res.json({ success: true, data: finalResults })
  } catch (err) {
    console.error('Places search error:', err)
    res.status(500).json({ success: false, error: 'Lỗi tìm kiếm địa điểm', details: err.message })
  }
})

// Hàm tính khoảng cách (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Bán kính trái đất (m)
  const toRad = deg => deg * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Khoảng cách tính bằng mét
}

// Get nearby playgrounds/amusement parks by location (kết hợp database và Goong)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, limit = 12 } = req.query
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' })
    }

    // 1. Lấy từ Goong API
    const goongPlaces = await searchNearbyPlaygrounds(parseFloat(lat), parseFloat(lng), 3000, limit)
    
    if (goongPlaces.length === 0) {
      return res.json({ success: true, data: [], message: 'Không tìm thấy địa điểm vui chơi gần bạn' })
    }

    // 2. Lấy placeIds từ kết quả Goong
    const placeIds = goongPlaces.map(p => p.placeId || p.id).filter(Boolean)
    
    // 3. Tìm các địa điểm này trong database (để lấy ảnh upload nếu có)
    const dbPlacesMap = new Map()
    if (placeIds.length > 0) {
      const dbPlaces = await Place.find({ placeId: { $in: placeIds } })
      dbPlaces.forEach(p => {
        dbPlacesMap.set(p.placeId, p)
      })
    }

    // 4. Kết hợp: Nếu địa điểm có trong database, dùng ảnh từ database
    const enrichedPlaces = goongPlaces.map(goongPlace => {
      const dbPlace = dbPlacesMap.get(goongPlace.placeId || goongPlace.id)
      if (dbPlace) {
        // Ưu tiên dữ liệu từ database (đặc biệt là ảnh, ageRange, price)
        return {
          ...goongPlace,
          image: dbPlace.images && dbPlace.images.length > 0 ? dbPlace.images[0] : (dbPlace.image || goongPlace.image),
          images: dbPlace.images || (dbPlace.image ? [dbPlace.image] : []),
          description: dbPlace.description || goongPlace.description,
          rating: dbPlace.rating || goongPlace.rating,
          ageRange: dbPlace.ageRange,
          price: dbPlace.price,
          openingHours: dbPlace.openingHours || goongPlace.openingHours
        }
      }
      return goongPlace
    })

    res.json({ success: true, data: enrichedPlaces })
  } catch (err) {
    console.error('Nearby places error:', err)
    res.status(500).json({ success: false, error: 'Lỗi tìm địa điểm gần đây', details: err.message })
  }
})

// Get place details (ưu tiên dữ liệu từ database nếu có)
router.get('/details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params
    if (!placeId) {
      return res.status(400).json({ success: false, error: 'Place ID is required' })
    }

    // 1. Kiểm tra trong database trước
    const existingPlace = await Place.findOne({ placeId })
    
    // 2. Lấy chi tiết từ Goong API
    const details = await getPlaceDetails(placeId)
    
    // 3. Lưu hoặc cập nhật place vào database
    let finalData = details
    try {
      if (existingPlace) {
        // Cập nhật viewCount và thông tin mới nhất (nhưng giữ ảnh upload)
        existingPlace.viewCount += 1
        existingPlace.name = details.name || existingPlace.name
        existingPlace.address = details.address || existingPlace.address
        existingPlace.lat = details.lat || existingPlace.lat
        existingPlace.lng = details.lng || existingPlace.lng
        existingPlace.rating = details.rating || existingPlace.rating
        existingPlace.phone = details.phone || existingPlace.phone
        existingPlace.website = details.website || existingPlace.website
        existingPlace.openingHours = details.openingHours || existingPlace.openingHours
        existingPlace.description = details.description || existingPlace.description
        // Giữ ảnh từ database nếu đã có (ảnh upload)
        if (!existingPlace.images || existingPlace.images.length === 0) {
          if (!existingPlace.image) {
            existingPlace.image = details.image
          }
        }
        existingPlace.types = details.types || existingPlace.types
        await existingPlace.save()
        
        // Trả về dữ liệu từ database (có ảnh upload, ageRange, price)
        finalData = {
          ...details,
          image: existingPlace.images && existingPlace.images.length > 0 ? existingPlace.images[0] : (existingPlace.image || details.image),
          images: existingPlace.images || (existingPlace.image ? [existingPlace.image] : []),
          description: existingPlace.description || details.description,
          viewCount: existingPlace.viewCount,
          ageRange: existingPlace.ageRange,
          price: existingPlace.price,
          openingHours: existingPlace.openingHours || details.openingHours
        }
      } else {
        // Tạo mới place
        const newPlace = new Place({
          placeId,
          name: details.name,
          address: details.address,
          lat: details.lat,
          lng: details.lng,
          rating: details.rating,
          phone: details.phone,
          website: details.website,
          openingHours: details.openingHours,
          description: details.description,
          image: details.image,
          types: details.types,
          viewCount: 1
        })
        await newPlace.save()
      }
    } catch (dbError) {
      console.error('Database save error:', dbError)
      // Không return error, vẫn trả về details cho người dùng
    }
    
    res.json({ success: true, data: finalData })
  } catch (err) {
    console.error('Place details error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết địa điểm', details: err.message })
  }
})

// Lấy chi tiết địa điểm từ database bằng MongoDB _id
router.get('/place/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ success: false, error: 'Place ID is required' })
    }

    // Tìm trong database bằng _id
    const place = await Place.findById(id)
    
    if (!place) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm' })
    }

    // Tăng viewCount
    place.viewCount = (place.viewCount || 0) + 1
    await place.save()

    const result = {
      _id: place._id.toString(),
      placeId: place.placeId,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      rating: place.rating,
      phone: place.phone,
      website: place.website,
      openingHours: place.openingHours,
      description: place.description,
      image: place.images && place.images.length > 0 ? place.images[0] : place.image,
      images: place.images || (place.image ? [place.image] : []),
      ageRange: place.ageRange,
      price: place.price,
      types: place.types,
      viewCount: place.viewCount,
      parking: place.parking,
      food: place.food,
      facilities: place.facilities,
      tags: place.tags || []
    }

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Get place by id error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy chi tiết địa điểm', details: err.message })
  }
})

// Reverse geocode (lat,lng -> address)
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query
    if (!lat || !lng) return res.status(400).json({ success: false, error: 'Latitude and longitude are required' })
    const address = await reverseGeocode(parseFloat(lat), parseFloat(lng))
    res.json({ success: true, data: address })
  } catch (err) {
    console.error('Reverse geocode error:', err)
    res.status(500).json({ success: false, error: 'Lỗi reverse geocode', details: err.message })
  }
})

module.exports = router