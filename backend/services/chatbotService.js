const Place = require('../models/Place')
const Review = require('../models/Review')
const Tag = require('../models/Tag')

const NO_DATA_RESPONSE = 'Không có dữ liệu'
const DEFAULT_TOP_K = Number.parseInt(process.env.CHATBOT_TOP_K || '5', 10)
const HISTORY_MAX_MESSAGES = Number.parseInt(process.env.CHATBOT_HISTORY_MAX_MESSAGES || '10', 10)
const SESSION_TTL_MS = Number.parseInt(process.env.CHATBOT_SESSION_TTL_MS || String(60 * 60 * 1000), 10)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

let cachedTagNorms = null
let cachedTagNormsAt = 0
const TAG_CACHE_TTL_MS = 5 * 60 * 1000

const sessions = new Map()

const ensureFetch = () => {
  if (!global.fetch) {
    const fetch = require('node-fetch')
    global.fetch = fetch
    global.Headers = fetch.Headers
    global.Request = fetch.Request
    global.Response = fetch.Response
  }
}

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

const QUESTION_STOPWORDS = new Set([
  'co', 'khong', 'nao', 'gi', 've', 'cho', 'toi', 'minh', 'ban', 'hay', 'la',
  'o', 'dau', 'dia', 'diem', 'noi', 'nay', 'do', 'gan', 'nhat', 'phu', 'hop',
  'bao', 'nhieu', 'may', 'gio', 'mo', 'cua', 'dong', 'tuoi', 'tre', 'em',
  'duoc', 'can', 'tim', 'goi', 'y', 'mot', 'vai', 'va', 'the', 'thi'
])

const getMeaningfulTokens = (text) => normalizeText(text)
  .split(' ')
  .map(token => token.trim())
  .filter(token => token.length >= 2 && !QUESTION_STOPWORDS.has(token) && !/^\d+$/.test(token))

const cleanupSessions = () => {
  const now = Date.now()
  for (const [key, session] of sessions.entries()) {
    if (!session || !session.updatedAt || now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(key)
    }
  }
}

const getConversationId = (raw) => {
  const s = String(raw || '').trim()
  return s || 'default'
}

const getSession = (conversationId) => {
  cleanupSessions()
  const cid = getConversationId(conversationId)
  const existing = sessions.get(cid)
  if (existing) {
    existing.updatedAt = Date.now()
    return existing
  }

  const created = { messages: [], focusPlaces: [], updatedAt: Date.now() }
  sessions.set(cid, created)
  return created
}

const pushSessionMessage = (session, role, content) => {
  if (!session || !Array.isArray(session.messages)) return
  const text = String(content || '').trim()
  if (!text) return
  session.messages.push({ role, content: text })
  if (session.messages.length > Math.max(50, HISTORY_MAX_MESSAGES * 6)) {
    session.messages = session.messages.slice(-Math.max(50, HISTORY_MAX_MESSAGES * 6))
  }
  session.updatedAt = Date.now()
}

const formatHistoryForPrompt = (messages) => {
  const list = Array.isArray(messages) ? messages : []
  return list
    .slice(-Math.max(0, HISTORY_MAX_MESSAGES))
    .map(m => {
      const role = m && m.role === 'assistant' ? 'Bot' : 'User'
      const text = m && m.content ? String(m.content).trim() : ''
      return text ? `${role}: ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

const getSmallTalkAnswer = (question) => {
  const q = normalizeText(question)
  if (!q) return null

  const words = q.split(' ').filter(Boolean)
  const hasPlaceIntent = [
    'dia diem', 'goi y', 'tim', 'choi', 'di dau', 'gan', 'gia',
    'mo cua', 'dia chi', 'chi duong', 'dat ve'
  ].some(keyword => q.includes(keyword))
  if (hasPlaceIntent && words.length > 3) return null

  const isShortMatch = (patterns) => patterns.some(pattern => q === pattern || (words.length <= 4 && q.includes(pattern)))

  if (isShortMatch(['chao', 'xin chao', 'hello', 'hi', 'hey', 'alo', 'bot oi'])) {
    return 'Xin chào! Mình có thể gợi ý địa điểm vui chơi, xem giá vé, giờ mở cửa, địa chỉ và đường đi cho bạn.'
  }
  if (isShortMatch(['cam on', 'thanks', 'thank you', 'tks', 'ok cam on'])) {
    return 'Không có gì nhé. Bạn cần tìm địa điểm nào nữa thì cứ nhắn mình.'
  }
  if (isShortMatch(['tam biet', 'bye', 'goodbye', 'hen gap lai'])) {
    return 'Tạm biệt nhé, chúc bạn có một chuyến đi vui!'
  }
  if (isShortMatch(['ban la ai', 'm la ai', 'may la ai', 'chatbot la ai'])) {
    return 'Mình là chatbot hỗ trợ gợi ý địa điểm vui chơi và cung cấp thông tin chi tiết cho từng địa điểm.'
  }
  if (isShortMatch(['ban lam duoc gi', 'bot lam duoc gi', 'giup gi duoc', 'huong dan'])) {
    return 'Mình có thể gợi ý địa điểm theo nhu cầu, trả lời giá vé, giờ mở cửa, địa chỉ, độ tuổi phù hợp và gửi link xem chi tiết.'
  }

  return null
}

const toRadians = (value) => (value * Math.PI) / 180

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const r = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

const extractLatLng = (text) => {
  const input = String(text || '')
  const match = input.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const lat = Number.parseFloat(match[1])
  const lng = Number.parseFloat(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

const getTagNorms = async () => {
  const now = Date.now()
  if (cachedTagNorms && now - cachedTagNormsAt < TAG_CACHE_TTL_MS) return cachedTagNorms

  const tags = await Tag.find({}, { name: 1 }).lean()
  cachedTagNorms = tags
    .map(t => normalizeText(t && t.name ? t.name : ''))
    .filter(Boolean)
  cachedTagNormsAt = now
  return cachedTagNorms
}

const extractTagsFromQuestion = async (question) => {
  const q = normalizeText(question)
  if (!q) return []

  const tagNorms = await getTagNorms()
  if (!Array.isArray(tagNorms) || tagNorms.length === 0) return []

  return Array.from(new Set(tagNorms.filter(tagNorm => q.includes(tagNorm))))
}

const getMentionedFocusPlaceMongoIds = (question, focusPlaces) => {
  const q = normalizeText(question)
  if (!q) return []
  const ids = []
  for (const p of Array.isArray(focusPlaces) ? focusPlaces : []) {
    const nameNorm = p && p.nameNorm ? p.nameNorm : normalizeText(p && p.placeName)
    const id = p && p.placeMongoId ? String(p.placeMongoId) : ''
    if (id && nameNorm && q.includes(nameNorm)) ids.push(id)
  }
  return Array.from(new Set(ids))
}

const isAmbiguousFollowUp = (question, focusPlaces, mentionedFocusIds) => {
  const focus = Array.isArray(focusPlaces) ? focusPlaces : []
  if (focus.length === 0) return false
  if (Array.isArray(mentionedFocusIds) && mentionedFocusIds.length > 0) return false

  const q = normalizeText(question)
  if (!q) return false

  if (['cho do', 'cho nay', 'noi do', 'o do', 'o day', 'dia diem do', 'dia diem nay', 'no'].some(k => q.includes(k))) {
    return true
  }

  const isShort = q.length <= 50 || q.split(' ').length <= 8
  if (!isShort) return false

  return [
    'may gio', 'dong cua', 'mo cua', 'gio mo cua', 'gia', 'bao nhieu',
    'dia chi', 'o dau', 'duong di', 'phu hop', 'do tuoi', 'tien ich',
    'an uong', 'bai do xe'
  ].some(k => q.includes(k))
}

const isLikelyFollowUp = (question, focusPlaces, mentionedFocusIds) => {
  if (Array.isArray(mentionedFocusIds) && mentionedFocusIds.length > 0) return true
  return isAmbiguousFollowUp(question, focusPlaces, mentionedFocusIds)
}

const placeToFocus = (place) => place
  ? [{
      placeMongoId: place._id ? String(place._id) : '',
      placeName: place.name || '',
      nameNorm: normalizeText(place.name || ''),
      count: 1
    }].filter(p => p.placeMongoId && p.placeName)
  : []

const placeLinkPayload = (place) => {
  const id = place && place._id ? String(place._id) : ''
  const name = place && place.name ? String(place.name) : ''
  if (!id || !name) return null
  return { id, name, path: `/place/${id}` }
}

const buildPlaceLines = (place) => {
  const lines = ['Loại: Địa điểm']
  if (place.name) lines.push(`Tên: ${place.name}`)
  if (place.address) lines.push(`Địa chỉ: ${place.address}`)
  if (place.description) lines.push(`Mô tả: ${place.description}`)
  if (place.ageRange) lines.push(`Độ tuổi phù hợp: ${place.ageRange}`)
  if (place.price) lines.push(`Gia: ${place.price}`)
  if (place.rating != null) lines.push(`Đánh giá: ${place.rating}`)
  if (Array.isArray(place.openingHours) && place.openingHours.length > 0) {
    lines.push(`Giờ mở cửa: ${place.openingHours.filter(Boolean).join('; ')}`)
  }
  if (place.parking) lines.push(`Bãi đỗ xe: ${place.parking}`)
  if (place.food) lines.push(`Ăn uống: ${place.food}`)
  if (place.facilities) lines.push(`Tiện ích: ${place.facilities}`)
  if (Array.isArray(place.tags) && place.tags.length > 0) {
    lines.push(`Tags: ${place.tags.join(', ')}`)
  }
  return lines
}

const buildReviewLines = (review) => {
  const lines = ['Loại: Đánh giá']
  const placeName = review.place && review.place.name ? review.place.name : ''
  if (placeName) lines.push(`Địa điểm: ${placeName}`)
  if (review.rating != null) lines.push(`Đánh giá: ${review.rating}`)
  if (review.comment) lines.push(`Nội dung: ${review.comment}`)
  return lines
}

const makeDoc = ({ pageContent, metadata }) => ({ pageContent, metadata })

const getDirectPlaceAnswer = (place, question) => {
  if (!place) return null
  const q = normalizeText(question)
  const name = place.name || 'Địa điểm này'

  if (/(^|\s)(gia|gia ve|bao nhieu|ve)(\s|$)/.test(q)) {
    return place.price ? `${name} có giá ${place.price}.` : NO_DATA_RESPONSE
  }
  if (/(^|\s)(may gio|gio mo cua|mo cua|dong cua|thoi gian|lich)(\s|$)/.test(q)) {
    const hours = Array.isArray(place.openingHours) ? place.openingHours.filter(Boolean).join('; ') : ''
    return hours ? `${name} mở cửa ${hours}.` : NO_DATA_RESPONSE
  }
  if (/(^|\s)(dia chi|o dau|nam o dau|vi tri)(\s|$)/.test(q)) {
    return place.address ? `${name} ở ${place.address}.` : NO_DATA_RESPONSE
  }
  if (/(^|\s)(do tuoi|tuoi|may tuoi|phu hop)(\s|$)/.test(q)) {
    return place.ageRange ? `${name} phù hợp cho độ tuổi ${place.ageRange}.` : NO_DATA_RESPONSE
  }
  if (/(^|\s)(bai do xe|do xe|gui xe|parking)(\s|$)/.test(q)) {
    return place.parking ? `${name}: bãi đỗ xe ${place.parking}.` : NO_DATA_RESPONSE
  }
  if (/(^|\s)(an uong|an|quan an|do an|food)(\s|$)/.test(q)) {
    return place.food ? `${name}: ăn uống ${place.food}.` : NO_DATA_RESPONSE
  }
  if (/(^|\s)(tien ich|wc|nha ve sinh|khu nghi|facilities)(\s|$)/.test(q)) {
    return place.facilities ? `${name}: tiện ích ${place.facilities}.` : NO_DATA_RESPONSE
  }

  return null
}

const findDirectPlace = async (question, focusPlaces, mentionedFocusIds, ambiguous) => {
  const projection = 'name address ageRange price openingHours parking food facilities tags lat lng'

  if (Array.isArray(mentionedFocusIds) && mentionedFocusIds.length > 0) {
    const place = await Place.findById(mentionedFocusIds[0], projection).lean()
    if (place) return place
  }

  const q = normalizeText(question)
  if (!q) return null

  const places = await Place.find({}, projection).lean()
  const explicitPlace = places
    .map(place => ({ place, nameNorm: normalizeText(place.name || '') }))
    .filter(item => item.nameNorm && q.includes(item.nameNorm))
    .sort((a, b) => b.nameNorm.length - a.nameNorm.length)[0]?.place || null
  if (explicitPlace) return explicitPlace

  if (ambiguous && Array.isArray(focusPlaces) && focusPlaces.length === 1 && focusPlaces[0].placeMongoId) {
    const place = await Place.findById(focusPlaces[0].placeMongoId, projection).lean()
    if (place) return place
  }

  return null
}

const isSwimmingIntent = (question) => {
  const q = normalizeText(question)
  return /(^|\s)(boi|di boi|ho boi|be boi|boi loi|cong vien nuoc|water park|waterpark|swimming|swim)(\s|$)/.test(q)
}

const isFreeIntent = (question) => /(^|\s)(mien phi|free|khong mat phi)(\s|$)/.test(normalizeText(question))

const getDirectRecommendation = async (question) => {
  const q = normalizeText(question)
  const places = await Place.find({}, 'name price tags rating viewCount').lean()
  let filtered = []

  if (isSwimmingIntent(question)) {
    filtered = places.filter(place => {
      const haystack = normalizeText([place.name, place.price, ...(place.tags || [])].join(' '))
      return ['boi', 'ho boi', 'be boi', 'boi loi', 'cong vien nuoc', 'water park'].some(term => haystack.includes(term))
    })
  } else if (isFreeIntent(question)) {
    filtered = places.filter(place => {
      const price = normalizeText(place.price)
      return !price || price.includes('mien phi') || price.includes('free') || /^0\s*(d|vnd)?$/.test(price)
    })
  } else {
    return null
  }

  filtered.sort((a, b) => {
    const score = (place) => Number(place.rating || 0) * 10 + Math.min(Number(place.viewCount || 0), 1000) / 100
    const aText = normalizeText([a.name, ...(a.tags || [])].join(' '))
    const bText = normalizeText([b.name, ...(b.tags || [])].join(' '))
    const aTagBonus = q.split(' ').some(token => token.length > 2 && aText.includes(token)) ? 20 : 0
    const bTagBonus = q.split(' ').some(token => token.length > 2 && bText.includes(token)) ? 20 : 0
    return (score(b) + bTagBonus) - (score(a) + aTagBonus)
  })

  const linkedPlaces = filtered.slice(0, 3).map(placeLinkPayload).filter(Boolean)
  if (linkedPlaces.length === 0) return { answer: NO_DATA_RESPONSE, places: [] }

  const names = linkedPlaces.map(p => p.name).join(', ')
  const kind = isSwimmingIntent(question) ? 'có bơi lội hoặc công viên nước' : 'miễn phí'
  return {
    answer: `Bạn có thể tham khảo ${names}. Đây là các địa điểm ${kind}.`,
    places: linkedPlaces
  }
}

const scoreDoc = (doc, question, tagFilterSet, filterSet) => {
  const meta = doc.metadata || {}
  const contentNorm = normalizeText(doc.pageContent || '')
  const nameNorm = normalizeText(meta.placeName || '')
  const tagsNorm = Array.isArray(meta.tagsNorm) ? meta.tagsNorm : []
  const tokens = getMeaningfulTokens(question)
  let score = 0

  if (filterSet && filterSet.size > 0 && meta.placeMongoId && filterSet.has(String(meta.placeMongoId))) score += 100

  for (const tag of tagFilterSet || []) {
    if (tagsNorm.includes(tag)) score += 30
  }

  const q = normalizeText(question)
  if (nameNorm && q.includes(nameNorm)) score += 80
  if (nameNorm && nameNorm.includes(q) && q.length >= 3) score += 50

  for (const token of tokens) {
    const tokenPattern = new RegExp(`(^|\\s)${token}(\\s|$)`)
    if (tokenPattern.test(nameNorm)) score += 12
    if (tagsNorm.some(tag => tag.includes(token))) score += 10
    if (contentNorm.includes(token)) score += token.length >= 4 ? 4 : 2
  }

  score += Math.min(Number(meta.rating || 0), 5)
  score += Math.min(Number(meta.viewCount || 0), 500) / 250
  return score
}

const retrieveDocs = async ({ question, filterIds = [], userLocation = null, limit = DEFAULT_TOP_K }) => {
  const [places, reviews, tagFilters] = await Promise.all([
    Place.find({}).lean(),
    Review.find({}).populate('place', 'name lat lng').sort({ createdAt: -1 }).limit(80).lean(),
    extractTagsFromQuestion(question)
  ])

  const filterSet = new Set((filterIds || []).map(String).filter(Boolean))
  const tagFilterSet = new Set(tagFilters)
  const docs = []

  for (const place of places) {
    const tagsNorm = Array.isArray(place.tags) ? place.tags.map(t => normalizeText(t)).filter(Boolean) : []
    if (filterSet.size > 0 && !filterSet.has(String(place._id))) continue
    if (tagFilterSet.size > 0 && !tagsNorm.some(t => tagFilterSet.has(t))) continue

    docs.push(makeDoc({
      pageContent: buildPlaceLines(place).join('\n'),
      metadata: {
        type: 'place',
        id: place._id ? String(place._id) : '',
        placeMongoId: place._id ? String(place._id) : '',
        placeId: place.placeId || '',
        placeName: place.name || '',
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        viewCount: place.viewCount,
        tags: Array.isArray(place.tags) ? place.tags : [],
        tagsNorm
      }
    }))
  }

  for (const review of reviews) {
    const place = review.place || {}
    const placeMongoId = place._id ? String(place._id) : ''
    if (filterSet.size > 0 && !filterSet.has(placeMongoId)) continue
    docs.push(makeDoc({
      pageContent: buildReviewLines(review).join('\n'),
      metadata: {
        type: 'review',
        id: review._id ? String(review._id) : '',
        placeMongoId,
        placeName: place.name || '',
        lat: typeof place.lat === 'number' ? place.lat : undefined,
        lng: typeof place.lng === 'number' ? place.lng : undefined,
        tagsNorm: []
      }
    }))
  }

  let origin = extractLatLng(question)
  if (!origin && userLocation && typeof userLocation === 'object') {
    const lat = Number(userLocation.lat)
    const lng = Number(userLocation.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) origin = { lat, lng }
  }

  const scored = docs
    .map(doc => {
      const meta = doc.metadata || {}
      let distanceKm = null
      if (origin && typeof meta.lat === 'number' && typeof meta.lng === 'number') {
        distanceKm = haversineKm(origin.lat, origin.lng, meta.lat, meta.lng)
        meta.distanceKm = distanceKm
      }
      const distanceScore = distanceKm == null ? 0 : Math.max(0, 12 - Math.min(distanceKm, 12))
      return { doc, score: scoreDoc(doc, question, tagFilterSet, filterSet) + distanceScore }
    })
    .filter(item => item.score > 0 || filterSet.size > 0 || tagFilterSet.size > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, Math.max(1, Number(limit) || DEFAULT_TOP_K)).map(item => item.doc)
}

const hasRelevantContext = (question, docs, { hasHardFilter = false } = {}) => {
  if (hasHardFilter) return true
  const tokens = getMeaningfulTokens(question)
  if (tokens.length === 0) return true

  const strongTokens = tokens.filter(token => token.length >= 4)
  return (Array.isArray(docs) ? docs : []).some(doc => {
    const contentNorm = normalizeText(doc && doc.pageContent ? doc.pageContent : '')
    const meta = doc && doc.metadata ? doc.metadata : {}
    const haystack = `${contentNorm} ${normalizeText(meta.placeName || '')} ${(meta.tagsNorm || []).join(' ')}`
    if (strongTokens.some(token => haystack.includes(token))) return true
    const looseMatches = tokens.filter(token => haystack.includes(token)).length
    return looseMatches >= Math.min(2, tokens.length)
  })
}

const normalizeNoDataResponse = (text) => {
  const trimmed = String(text || '').trim()
  const normalized = normalizeText(trimmed.replace(/[.!?。！？]+$/g, ''))
  return normalized === normalizeText(NO_DATA_RESPONSE) ? NO_DATA_RESPONSE : trimmed
}

const getGeminiApiKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is required in backend/.env or Render environment variables')
  return key
}

const getGeminiModel = () => String(process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite').trim()

const extractGeminiText = (data) => {
  const parts = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && Array.isArray(data.candidates[0].content.parts)
    ? data.candidates[0].content.parts
    : []
  return parts.map(part => part && part.text ? String(part.text) : '').filter(Boolean).join('\n').trim()
}

const callGemini = async ({ system, prompt, maxOutputTokens = 512, temperature = 0.2 }) => {
  ensureFetch()
  const model = getGeminiModel()
  const key = getGeminiApiKey()
  const url = `${GEMINI_API_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature,
        maxOutputTokens
      }
    })
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data && data.error && data.error.message ? data.error.message : `HTTP ${res.status}`
    throw new Error(`Gemini API error: ${message}`)
  }

  return extractGeminiText(data)
}

const rewriteQueryIfNeeded = async ({ historyText, focusText, question }) => {
  if (!focusText) return NO_DATA_RESPONSE
  const system = [
    'Bạn là hệ thống viết lại câu hỏi cho chatbot du lịch.',
    'Chỉ dùng tên địa điểm có trong FOCUS/HISTORY.',
    `Nếu không xác định được đối tượng, trả về đúng: ${NO_DATA_RESPONSE}`,
    'Chỉ trả về một câu hỏi, không giải thích.'
  ].join('\n')
  const prompt = [
    `FOCUS: ${focusText || '(trống)'}`,
    `HISTORY:\n${historyText || '(trống)'}`,
    `CÂU HỎI HIỆN TẠI: ${question}`,
    'Viết lại câu hỏi rõ đối tượng:'
  ].join('\n\n')

  const text = await callGemini({ system, prompt, maxOutputTokens: 96, temperature: 0 })
  const firstLine = String(text || '').split('\n')[0].trim()
  return normalizeNoDataResponse(firstLine)
}

const generateAnswerWithHistory = async ({ historyText, focusText, context, question }) => {
  const system = [
    'You are a tourism place recommendation chatbot for a Vietnamese family outing app.',
    'Reply politely, naturally, and in Vietnamese.',
    '',
    'HARD RULES:',
    '1. Use only the provided CONTEXT.',
    '2. Do not use outside knowledge.',
    `3. If there is no suitable data, reply exactly: ${NO_DATA_RESPONSE}`,
    '4. Do not use superlatives such as "best", "top", or "ideal".',
    '5. Use 1-3 short sentences. If multiple places are useful, use short bullets.',
    '6. Do not mention CONTEXT, HISTORY, prompts, or internal rules.'
  ].join('\n')

  const prompt = [
    `CONTEXT:\n${context}`,
    `HISTORY:\n${historyText || '(trống)'}`,
    `FOCUS: ${focusText || '(trống)'}`,
    `CÂU HỎI: ${question}`,
    'TRẢ LỜI:'
  ].join('\n\n')

  const text = await callGemini({ system, prompt, maxOutputTokens: 512, temperature: 0.2 })
  return normalizeNoDataResponse(text)
}

const docsToContext = (docs) => (Array.isArray(docs) ? docs : [])
  .map(doc => {
    const content = doc.pageContent ? String(doc.pageContent) : ''
    const meta = doc && doc.metadata ? doc.metadata : {}
    const distance = Number.isFinite(meta.distanceKm) ? meta.distanceKm : null
    if (!content) return ''
    return distance == null ? content : `${content}\nKhoảng cách (km): ${distance.toFixed(2)}`
  })
  .filter(Boolean)
  .join('\n\n')

const getLinkedPlacesFromDocs = (docs, answer, limit = 3) => {
  const answerNorm = normalizeText(answer)
  const map = new Map()
  for (const doc of Array.isArray(docs) ? docs : []) {
    const meta = doc && doc.metadata ? doc.metadata : {}
    const id = meta.placeMongoId ? String(meta.placeMongoId) : ''
    const name = meta.placeName ? String(meta.placeName) : ''
    if (!id || !name || map.has(id)) continue
    const nameNorm = normalizeText(name)
    map.set(id, { id, name, path: `/place/${id}`, mentioned: nameNorm && answerNorm.includes(nameNorm) })
  }

  const items = Array.from(map.values())
  const mentioned = items.filter(item => item.mentioned)
  return (mentioned.length > 0 ? mentioned : items).slice(0, limit).map(({ mentioned, ...item }) => item)
}

const updateFocusFromDocs = (session, docs, answer) => {
  if (!session || answer === NO_DATA_RESPONSE) return
  const candidatesMap = new Map()
  for (const d of Array.isArray(docs) ? docs : []) {
    const meta = d && d.metadata ? d.metadata : {}
    const pid = meta.placeMongoId ? String(meta.placeMongoId) : ''
    const pname = meta.placeName ? String(meta.placeName) : ''
    if (!pid || !pname) continue
    if (!candidatesMap.has(pid)) {
      candidatesMap.set(pid, { placeMongoId: pid, placeName: pname, nameNorm: normalizeText(pname), count: 0 })
    }
    candidatesMap.get(pid).count += 1
  }

  const candidates = Array.from(candidatesMap.values()).sort((a, b) => b.count - a.count)
  const answerNorm = normalizeText(answer)
  const mentioned = candidates.filter(c => c.nameNorm && answerNorm.includes(c.nameNorm))
  session.focusPlaces = (mentioned.length > 0 ? mentioned : candidates).slice(0, 3)
}

const answerQuestion = async (question, conversationId, userLocation) => {
  const sanitized = String(question || '').trim()
  const cid = getConversationId(conversationId)
  if (!sanitized) return { answer: NO_DATA_RESPONSE, conversationId: cid, places: [] }

  const session = getSession(cid)
  const smallTalkAnswer = getSmallTalkAnswer(sanitized)
  if (smallTalkAnswer) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', smallTalkAnswer)
    return { answer: smallTalkAnswer, conversationId: cid, places: [] }
  }

  const historyText = formatHistoryForPrompt(session.messages)
  const focusPlaces = Array.isArray(session.focusPlaces) ? session.focusPlaces : []
  const mentionedFocusIds = getMentionedFocusPlaceMongoIds(sanitized, focusPlaces)
  const ambiguous = isAmbiguousFollowUp(sanitized, focusPlaces, mentionedFocusIds)

  const directPlace = await findDirectPlace(sanitized, focusPlaces, mentionedFocusIds, ambiguous)
  const directAnswer = getDirectPlaceAnswer(directPlace, sanitized)
  if (directAnswer) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', directAnswer)
    const linkedPlace = placeLinkPayload(directPlace)
    if (directAnswer !== NO_DATA_RESPONSE) session.focusPlaces = placeToFocus(directPlace)
    return { answer: directAnswer, conversationId: cid, places: linkedPlace ? [linkedPlace] : [] }
  }

  const directRecommendation = await getDirectRecommendation(sanitized)
  if (directRecommendation) {
    const places = Array.isArray(directRecommendation.places) ? directRecommendation.places : []
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', directRecommendation.answer)
    if (places.length > 0) {
      session.focusPlaces = places.map(place => ({
        placeMongoId: place.id,
        placeName: place.name,
        nameNorm: normalizeText(place.name),
        count: 1
      }))
    }
    return { answer: directRecommendation.answer, conversationId: cid, places }
  }

  const isFollowUp = isLikelyFollowUp(sanitized, focusPlaces, mentionedFocusIds)
  if (!isFollowUp && focusPlaces.length > 0) {
    session.messages = []
    session.focusPlaces = []
  }

  const effectiveHistoryText = isFollowUp ? historyText : ''
  const effectiveFocusPlaces = isFollowUp ? focusPlaces : []
  const effectiveFocusText = effectiveFocusPlaces.map(p => p && p.placeName ? String(p.placeName) : '').filter(Boolean).join(', ')

  let rewrittenQuestion = sanitized
  if (ambiguous && isFollowUp && effectiveFocusText) {
    const rewritten = await rewriteQueryIfNeeded({
      historyText: effectiveHistoryText,
      focusText: effectiveFocusText,
      question: sanitized
    })

    if (rewritten === NO_DATA_RESPONSE) {
      pushSessionMessage(session, 'user', sanitized)
      pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
      return { answer: NO_DATA_RESPONSE, conversationId: cid, places: [] }
    }

    const rewriteNorm = normalizeText(rewritten)
    const hasFocusMention = effectiveFocusPlaces.some(p => p && p.nameNorm && rewriteNorm.includes(p.nameNorm))
    if (!hasFocusMention) {
      pushSessionMessage(session, 'user', sanitized)
      pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
      return { answer: NO_DATA_RESPONSE, conversationId: cid, places: [] }
    }
    rewrittenQuestion = rewritten
  }

  let filterIds = []
  if (mentionedFocusIds.length > 0) {
    filterIds = mentionedFocusIds
  } else if (ambiguous && isFollowUp && effectiveFocusPlaces.length > 0) {
    filterIds = effectiveFocusPlaces.map(p => p && p.placeMongoId ? String(p.placeMongoId) : '').filter(Boolean)
  }

  const docs = await retrieveDocs({ question: rewrittenQuestion, filterIds, userLocation, limit: DEFAULT_TOP_K })
  const hasHardFilter = filterIds.length > 0 || (ambiguous && isFollowUp)
  if (!docs || docs.length === 0 || !hasRelevantContext(rewrittenQuestion, docs, { hasHardFilter })) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
    return { answer: NO_DATA_RESPONSE, conversationId: cid, places: [] }
  }

  const context = docsToContext(docs)
  if (!context.trim()) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
    return { answer: NO_DATA_RESPONSE, conversationId: cid, places: [] }
  }

  const answer = await generateAnswerWithHistory({
    historyText: effectiveHistoryText,
    focusText: effectiveFocusText,
    context,
    question: rewrittenQuestion
  })
  const finalAnswer = normalizeNoDataResponse(answer)

  pushSessionMessage(session, 'user', sanitized)
  pushSessionMessage(session, 'assistant', finalAnswer)
  updateFocusFromDocs(session, docs, finalAnswer)

  const linkedPlaces = finalAnswer !== NO_DATA_RESPONSE ? getLinkedPlacesFromDocs(docs, finalAnswer) : []
  return { answer: finalAnswer, conversationId: cid, places: linkedPlaces }
}

module.exports = {
  answerQuestion,
  NO_DATA_RESPONSE
}
