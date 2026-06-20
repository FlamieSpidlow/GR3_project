const express = require('express')
const router = express.Router()
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

// Search places by name or keyword from database only.
// Public result cards navigate by local Mongo _id.
router.get('/search', async (req, res) => {
  try {
    const { limit = 10, age } = req.query
    const rawQuery = String(req.query.query || '').trim()
    if (!rawQuery) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' })
    }

    const { lat, lng } = req.query
    const parsedLimit = parseInt(limit, 10)
    const limitNum = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 10
    const ageFromParam = age !== undefined && age !== '' ? parseInt(age, 10) : null

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

    const hasNormalizedPhrase = (text, phrase) => {
      const normalizedPhrase = normalizeText(phrase)
      if (!normalizedPhrase) return false
      const pattern = new RegExp(`(^|\\s)${escapeRegex(normalizedPhrase)}(\\s|$)`)
      return pattern.test(text)
    }

    const extractAgeFromText = (normalized) => {
      // Examples: "5 tuoi", "tuoi 5", "5t"
      const m1 = normalized.match(/\b(\d{1,2})\s*(tuoi|t)\b/)
      if (m1) return parseInt(m1[1])
      const m2 = normalized.match(/\btuoi\s*(\d{1,2})\b/)
      if (m2) return parseInt(m2[1])
      return null
    }

    const normalizedQuery = normalizeText(rawQuery)
    const isWaterParkQuery = /(^|\s)(cong vien nuoc|water park|waterpark|vinwonders water|cong vien bang phao)(\s|$)/.test(normalizedQuery) ||
      (/(^|\s)cong vien(\s|$)/.test(normalizedQuery) && /(^|\s)(nuoc|bang phao|water)(\s|$)/.test(normalizedQuery))
    const isIndoorPlayQuery = /(^|\s)(khu vui choi trong nha|nha bong|indoor playground|playground trong nha)(\s|$)/.test(normalizedQuery)
    const isBallPitQuery = /(^|\s)(nha bong|ball pit|ballpool|ball pool)(\s|$)/.test(normalizedQuery)
    const isFreeQuery = /(^|\s)(mien phi|free|khong mat phi)(\s|$)/.test(normalizedQuery)
    const isZooQuery = /(^|\s)(so thu|vuon thu|zoo)(\s|$)/.test(normalizedQuery)

    // age priority: explicit param > extracted from query text
    const extractedAge = extractAgeFromText(normalizedQuery)
    const ageFilter = Number.isFinite(ageFromParam) ? ageFromParam : extractedAge
    const queryWithoutAge = normalizedQuery
      .replace(/\b\d{1,2}\s*(tuoi|t)\b/g, ' ')
      .replace(/\btuoi\s*\d{1,2}\b/g, ' ')
      .replace(/\b(cho|be|tre|em|phu hop|dia diem|khu vui choi|choi|di choi|diem)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const isAgeOnlyQuery = Number.isFinite(extractedAge) && queryWithoutAge === ''

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
      'văn hóa': 'Văn hóa', 'van hoa': 'Văn hóa', 'culture': 'Văn hóa', 'cultural': 'Văn hóa',
      // Bảo tàng / Khám phá
      'bảo tàng': 'Bảo tàng', 'bao tang': 'Bảo tàng', 'museum': 'Bảo tàng',
      // Tâm linh / di tích
      'tâm linh': 'Tâm linh', 'tam linh': 'Tâm linh', 'di tích': 'Di tích', 'di tich': 'Di tích'
    }
    // Tìm tag từ keyword trong query (dựa trên normalizedQuery để bỏ dấu)
    let matchedTags = []
    for (const [keyword, tag] of Object.entries(keywordToTag)) {
      if (hasNormalizedPhrase(normalizedQuery, keyword)) {
        if (!matchedTags.includes(tag)) matchedTags.push(tag)
      }
    }

    const tagDocs = await Tag.find({}, { name: 1, nameNorm: 1 }).lean()
    const tagByNorm = new Map()
    for (const tagDoc of tagDocs) {
      const tagName = String(tagDoc.name || '').trim()
      const tagNorm = normalizeText(tagDoc.nameNorm || tagName)
      if (!tagName || !tagNorm) continue
      tagByNorm.set(tagNorm, tagName)
      if (hasNormalizedPhrase(normalizedQuery, tagNorm) && !matchedTags.includes(tagName)) {
        matchedTags.push(tagName)
      }
    }
    matchedTags = matchedTags
      .map(tag => tagByNorm.get(normalizeText(tag)) || tag)
      .filter(Boolean)
      .filter((tag, index, arr) => arr.indexOf(tag) === index)
    if (isWaterParkQuery) {
      matchedTags = matchedTags.filter(tag => normalizeText(tag) !== 'cong vien')
    }
    const strictIdentityTerms = ['chua', 'den', 'nha tho']
    const strictIdentityQuery = strictIdentityTerms.some(term => {
      const termPattern = new RegExp(`(^|\\s)${escapeRegex(term)}(\\s|$)`)
      return termPattern.test(normalizedQuery)
    })

    // Build a fast Mongo candidate query first. Age is filtered safely in JS below
    // because ageRange can contain dirty strings that would make $toInt fail.
    const andClauses = []

    // Accent-sensitive Mongo query first, then accent-insensitive fallback below.
    const safeRegex = escapeRegex(rawQuery)
    const identityOrClauses = [
      { name: { $regex: safeRegex, $options: 'i' } },
      { types: { $regex: safeRegex, $options: 'i' } },
      { tags: { $regex: safeRegex, $options: 'i' } }
    ]
    const primaryOrClauses = [
      ...identityOrClauses,
      { address: { $regex: safeRegex, $options: 'i' } },
      { price: { $regex: safeRegex, $options: 'i' } }
    ]
    const broadOrClauses = [
      ...primaryOrClauses,
      { description: { $regex: safeRegex, $options: 'i' } }
    ]

    if (strictIdentityQuery) {
      andClauses.push({ $or: identityOrClauses })
    } else if (matchedTags.length > 0) {
      andClauses.push({ $or: [...primaryOrClauses, { tags: { $in: matchedTags } }] })
    } else {
      andClauses.push({ $or: broadOrClauses })
    }
    const mongoFilter = andClauses.length > 1 ? { $and: andClauses } : andClauses[0]

    const matchedTagsNorm = matchedTags.map(t => normalizeText(t))

    const parseAgeRange = (ageRange) => {
      const match = String(ageRange || '').match(/(\d{1,2})\s*-\s*(\d{1,2})/)
      if (!match) return null
      const min = parseInt(match[1], 10)
      const max = parseInt(match[2], 10)
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null
      return { min, max }
    }

    const matchesAge = (place) => {
      if (!Number.isFinite(ageFilter)) return true
      const range = parseAgeRange(place.ageRange)
      if (!range) return true
      return range.min <= ageFilter && range.max >= ageFilter
    }

    const matchesWaterParkIntent = (place) => {
      if (!isWaterParkQuery) return true
      const strongFields = [
        place.name,
        ...(place.types || []),
        ...(place.tags || [])
      ].map(normalizeText).filter(Boolean)
      const strongJoined = strongFields.join(' ')
      const descriptionNorm = normalizeText(place.description)
      const fields = [
        place.address,
        descriptionNorm
      ].map(normalizeText).filter(Boolean)
      const joined = fields.join(' ')
      const waterParkTerms = [
        'cong vien nuoc',
        'water park',
        'waterpark',
        'vinwonders water',
        'waterfun',
        'wave park',
        'bang phao'
      ]
      if (waterParkTerms.some(term => strongJoined.includes(term))) return true

      const mentionsNearbyWaterPark = /(sat ben|gan|canh)\s+cong vien nuoc/.test(descriptionNorm)
      return !mentionsNearbyWaterPark && waterParkTerms.some(term => joined.includes(term))
    }

    const matchesIndoorPlayIntent = (place) => {
      if (!isIndoorPlayQuery) return true
      const fields = [
        place.name,
        place.address,
        place.description,
        ...(place.types || []),
        ...(place.tags || [])
      ].map(normalizeText).filter(Boolean)
      const joined = fields.join(' ')
      const ballPitTerms = [
        'nha bong',
        'playtime',
        'tiniworld',
        'kidzooona',
        'kidzania',
        'wolfoo',
        'funny land',
        'kolorado',
        'vinke'
      ]
      const indoorPlayTerms = [
        ...ballPitTerms,
        'khu vui choi tre em',
        'kids club',
        'jump arena',
        'vietclimb',
        'children playground',
        'indoor playground'
      ]
      const specificTerms = isBallPitQuery ? ballPitTerms : indoorPlayTerms
      if (specificTerms.some(term => joined.includes(term))) return true
      if (isBallPitQuery) return false

      const tagNorms = (place.tags || []).map(normalizeText)
      const hasIndoor = tagNorms.includes('trong nha')
      const hasPlayTag = tagNorms.some(tag => ['giai tri', 'van dong'].includes(tag))
      const excludedGeneric = [
        'bao tang',
        'chua',
        'thuy cung',
        'aquarium',
        'trung tam thuong mai',
        'mall',
        'lotte',
        'vincom',
        'aeon',
        'royal city',
        'rap xiec',
        'bieu dien'
      ].some(term => joined.includes(term))

      return hasIndoor && hasPlayTag && !excludedGeneric
    }

    const matchesFreeIntent = (place) => {
      if (!isFreeQuery) return true
      const priceNorm = normalizeText(place.price)
      if (!priceNorm) return true
      if (priceNorm.includes('mien phi') || priceNorm.includes('free')) return true
      const digits = priceNorm.replace(/[^\d]/g, '')
      return digits !== '' && Number.parseInt(digits, 10) === 0
    }

    const matchesZooIntent = (place) => {
      if (!isZooQuery) return true
      const fields = [
        place.name,
        place.address,
        place.description,
        ...(place.types || []),
        ...(place.tags || [])
      ].map(normalizeText).filter(Boolean)
      const joined = fields.join(' ')
      const tagNorms = (place.tags || []).map(normalizeText)
      return [
        'so thu',
        'vuon thu',
        'cham soc thu',
        'thu le'
      ].some(term => joined.includes(term)) || tagNorms.includes('dong vat')
    }

    const matchesSpecialExpansion = (place) =>
      (isWaterParkQuery && matchesWaterParkIntent(place)) ||
      (isIndoorPlayQuery && matchesIndoorPlayIntent(place)) ||
      (isFreeQuery && matchesFreeIntent(place)) ||
      (isZooQuery && matchesZooIntent(place))

    const matchesNormalizedQuery = (place) => {
      if (isAgeOnlyQuery) return true

      const identityFields = [
        place.name,
        ...(place.types || []),
        ...(place.tags || [])
      ].map(normalizeText).filter(Boolean)
      const primaryFields = [
        ...identityFields,
        place.address,
        place.price
      ].map(normalizeText).filter(Boolean)
      const allFields = [
        ...primaryFields,
        place.description
      ].map(normalizeText).filter(Boolean)
      const queryTokens = normalizedQuery.split(' ').filter(token => token.length > 1)
      const phrasePattern = new RegExp(`(^|\\s)${escapeRegex(normalizedQuery)}(\\s|$)`)
      const identityPhraseMatched = identityFields.some(field => phrasePattern.test(field))
      const primaryPhraseMatched = primaryFields.some(field => phrasePattern.test(field))
      const exactTextMatched = allFields.some(field => phrasePattern.test(field))
      const looseTextMatched = matchedTagsNorm.length === 0 &&
        queryTokens.length > 1 &&
        queryTokens.every(token => {
          const tokenPattern = new RegExp(`(^|\\s)${escapeRegex(token)}(\\s|$)`)
          return primaryFields.some(field => tokenPattern.test(field))
        })
      const tagMatched = matchedTagsNorm.length > 0 &&
        matchedTagsNorm.some(tag => identityFields.includes(tag))
      if (strictIdentityQuery) {
        return identityPhraseMatched
      }
      if (matchedTagsNorm.length > 0) {
        return tagMatched || identityPhraseMatched
      }
      return exactTextMatched || looseTextMatched
    }

    const matchesSearchCandidate = (place) => matchesNormalizedQuery(place) || matchesSpecialExpansion(place)

    let dbPlaces = await Place.find(mongoFilter).lean()
    const seenPlaceIds = new Set(dbPlaces.map(place => String(place._id)))

    if (normalizedQuery) {
      const fallbackPlaces = await Place.find({}).lean()
      for (const place of fallbackPlaces) {
        const id = String(place._id)
        if (seenPlaceIds.has(id) || !matchesSearchCandidate(place)) continue
        seenPlaceIds.add(id)
        dbPlaces.push(place)
      }
    }

    dbPlaces = dbPlaces.filter(place =>
      matchesAge(place) &&
      matchesSearchCandidate(place) &&
      matchesWaterParkIntent(place) &&
      matchesIndoorPlayIntent(place) &&
      matchesFreeIntent(place) &&
      matchesZooIntent(place)
    )
    console.log(`Database search for "${rawQuery}" (age=${ageFilter ?? 'n/a'}, tags=${matchedTags.join(', ') || 'n/a'}): found ${dbPlaces.length} places`)

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

// Get nearby places from database only
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 3000, limit = 12 } = req.query
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' })
    }

    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    const radiusNum = parseFloat(radius)
    const parsedLimit = parseInt(limit, 10)
    const limitNum = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 12

    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude or longitude' })
    }

    const maxDistance = Number.isFinite(radiusNum) && radiusNum > 0 ? radiusNum : 3000
    const places = await Place.find({
      lat: { $type: 'number' },
      lng: { $type: 'number' }
    }).lean()

    const results = places
      .map(place => {
        const distance = calculateDistance(userLat, userLng, place.lat, place.lng)
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
          distance
        }
      })
      .filter(place => place.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limitNum)

    res.json({ success: true, data: results })
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

    const place = await Place.findOne({ placeId })
    if (!place) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy địa điểm trong database' })
    }

    place.viewCount = (place.viewCount || 0) + 1
    await place.save()

    res.json({
      success: true,
      data: {
        _id: place._id.toString(),
        id: place._id.toString(),
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
        tags: place.tags || [],
        source: 'database'
      }
    })
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

// Approximate reverse geocode from nearest database place
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query
    if (!lat || !lng) return res.status(400).json({ success: false, error: 'Latitude and longitude are required' })
    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude or longitude' })
    }

    const places = await Place.find({
      lat: { $type: 'number' },
      lng: { $type: 'number' },
      address: { $exists: true, $ne: '' }
    }, { address: 1, lat: 1, lng: 1 }).lean()

    const nearest = places
      .map(place => ({
        address: place.address,
        distance: calculateDistance(userLat, userLng, place.lat, place.lng)
      }))
      .sort((a, b) => a.distance - b.distance)[0]

    res.json({ success: true, data: nearest ? nearest.address : null })
  } catch (err) {
    console.error('Reverse geocode error:', err)
    res.status(500).json({ success: false, error: 'Lỗi reverse geocode', details: err.message })
  }
})

module.exports = router
