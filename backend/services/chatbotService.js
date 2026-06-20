const Place = require('../models/Place')
const Review = require('../models/Review')
const Tag = require('../models/Tag')

const NO_DATA_RESPONSE = 'Không có dữ liệu'
const DEFAULT_TOP_K = Number.parseInt(process.env.CHATBOT_TOP_K || '3', 10)
const CACHE_TTL_MS = Number.parseInt(process.env.CHATBOT_CACHE_TTL_MS || '300000', 10)
const DEFAULT_NUM_PREDICT = Number.parseInt(process.env.OLLAMA_NUM_PREDICT || '256', 10)
const DEFAULT_REWRITE_NUM_PREDICT = Number.parseInt(process.env.OLLAMA_REWRITE_NUM_PREDICT || '96', 10)
const OLLAMA_TAGS_TTL_MS = 60 * 1000
const HISTORY_MAX_MESSAGES = Number.parseInt(process.env.CHATBOT_HISTORY_MAX_MESSAGES || '10', 10)
const SESSION_TTL_MS = Number.parseInt(process.env.CHATBOT_SESSION_TTL_MS || String(60 * 60 * 1000), 10)
const CONTEXT_MAX_DOCS_RAW = Number.parseInt(process.env.CHATBOT_CONTEXT_MAX_DOCS || '0', 10)
const CONTEXT_MAX_DOCS = Number.isFinite(CONTEXT_MAX_DOCS_RAW) ? CONTEXT_MAX_DOCS_RAW : 0

let cachedStore = null
let cachedAt = 0
let cachedLangchain = null

let cachedOllamaTags = null
let cachedOllamaTagsAt = 0

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

const getOllamaBaseUrl = () => {
  const baseUrl = process.env.OLLAMA_BASE_URL
  if (!baseUrl) {
    throw new Error('OLLAMA_BASE_URL is required in backend/.env')
  }
  return baseUrl
}

const loadLangchain = async () => {
  if (cachedLangchain) return cachedLangchain

  ensureFetch()

  const [chatModule, embedModule, vectorModule, promptModule, docModule, msgModule] = await Promise.all([
    import('@langchain/community/chat_models/ollama'),
    import('@langchain/community/embeddings/ollama'),
    import('langchain/vectorstores/memory'),
    import('@langchain/core/prompts'),
    import('@langchain/core/documents'),
    import('@langchain/core/messages')
  ])

  cachedLangchain = {
    ChatOllama: chatModule.ChatOllama,
    OllamaEmbeddings: embedModule.OllamaEmbeddings,
    MemoryVectorStore: vectorModule.MemoryVectorStore,
    PromptTemplate: promptModule.PromptTemplate,
    Document: docModule.Document,
    HumanMessage: msgModule.HumanMessage,
    AIMessage: msgModule.AIMessage,
    SystemMessage: msgModule.SystemMessage
  }

  return cachedLangchain
}

const normalizeModelName = (value) => String(value || '').trim()

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
  'duoc', 'khong', 'can', 'tim', 'goi', 'y', 'mot', 'vai'
])

const getMeaningfulTokens = (text) => normalizeText(text)
  .split(' ')
  .map(token => token.trim())
  .filter(token => token.length >= 2 && !QUESTION_STOPWORDS.has(token) && !/^\d+$/.test(token))

const getSmallTalkAnswer = (question) => {
  const q = normalizeText(question)
  if (!q) return null

  const words = q.split(' ').filter(Boolean)
  const hasPlaceIntent = [
    'dia diem',
    'goi y',
    'tim',
    'choi',
    'di dau',
    'gan',
    'gia',
    'mo cua',
    'dia chi',
    'chi duong',
    'dat ve'
  ].some(keyword => q.includes(keyword))

  if (hasPlaceIntent && words.length > 3) return null

  const greetings = [
    'chao',
    'xin chao',
    'hello',
    'hi',
    'hey',
    'alo',
    'chao ban',
    'bot oi'
  ]
  const thanks = [
    'cam on',
    'thanks',
    'thank you',
    'tks',
    'ok cam on',
    'cam on ban'
  ]
  const farewells = [
    'tam biet',
    'bye',
    'goodbye',
    'hen gap lai'
  ]
  const identityQuestions = [
    'ban la ai',
    'm la ai',
    'may la ai',
    'chatbot la ai'
  ]
  const helpQuestions = [
    'ban lam duoc gi',
    'bot lam duoc gi',
    'giup gi duoc',
    'huong dan'
  ]

  const isExactOrShortMatch = (patterns) => patterns.some(pattern => q === pattern || (words.length <= 4 && q.includes(pattern)))

  if (isExactOrShortMatch(greetings)) {
    return 'Xin chào! Mình có thể gợi ý địa điểm vui chơi, xem giá vé, giờ mở cửa, địa chỉ và đường đi cho bạn.'
  }

  if (isExactOrShortMatch(thanks)) {
    return 'Không có gì nhé. Bạn cần tìm địa điểm nào nữa thì cứ nhắn mình.'
  }

  if (isExactOrShortMatch(farewells)) {
    return 'Tạm biệt nhé, chúc bạn có một chuyến đi vui!'
  }

  if (isExactOrShortMatch(identityQuestions)) {
    return 'Mình là chatbot hỗ trợ gợi ý địa điểm vui chơi và cung cấp thông tin chi tiết cho từng địa điểm.'
  }

  if (isExactOrShortMatch(helpQuestions)) {
    return 'Mình có thể gợi ý địa điểm theo nhu cầu, trả lời giá vé, giờ mở cửa, địa chỉ, độ tuổi phù hợp và gửi link xem chi tiết.'
  }

  return null
}

const hasRelevantContext = (question, docs, { hasHardFilter = false } = {}) => {
  if (hasHardFilter) return true

  const tokens = getMeaningfulTokens(question)
  if (tokens.length === 0) return true

  const strongTokens = tokens.filter(token => token.length >= 4)
  return (Array.isArray(docs) ? docs : []).some(doc => {
    const contentNorm = normalizeText(doc && doc.pageContent ? doc.pageContent : '')
    const meta = doc && doc.metadata ? doc.metadata : {}
    const nameNorm = normalizeText(meta.placeName || '')
    const tagsNorm = Array.isArray(meta.tagsNorm) ? meta.tagsNorm.join(' ') : ''
    const haystack = `${contentNorm} ${nameNorm} ${tagsNorm}`
    const strongMatches = strongTokens.filter(token => haystack.includes(token)).length
    if (strongMatches > 0) return true
    const looseMatches = tokens.filter(token => haystack.includes(token)).length
    return looseMatches >= Math.min(2, tokens.length)
  })
}

const cleanupSessions = () => {
  const now = Date.now()
  for (const [key, session] of sessions.entries()) {
    if (!session || !session.updatedAt) {
      sessions.delete(key)
      continue
    }
    if (now - session.updatedAt > SESSION_TTL_MS) sessions.delete(key)
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
  const created = {
    messages: [],
    focusPlaces: [],
    updatedAt: Date.now()
  }
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
  const slice = list.slice(-Math.max(0, HISTORY_MAX_MESSAGES))
  if (slice.length === 0) return ''
  return slice
    .map(m => {
      const role = m && m.role === 'assistant' ? 'Bot' : 'User'
      const text = m && m.content ? String(m.content).trim() : ''
      return text ? `${role}: ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

const getMentionedFocusPlaceMongoIds = (question, focusPlaces) => {
  const q = normalizeText(question)
  if (!q) return []
  const focus = Array.isArray(focusPlaces) ? focusPlaces : []
  const ids = []
  for (const p of focus) {
    const nameNorm = p && p.nameNorm ? p.nameNorm : normalizeText(p && p.placeName)
    const id = p && p.placeMongoId ? String(p.placeMongoId) : ''
    if (!id || !nameNorm) continue
    if (q.includes(nameNorm)) ids.push(id)
  }
  return Array.from(new Set(ids))
}

const isAmbiguousFollowUp = (question, focusPlaces, mentionedFocusIds) => {
  const focus = Array.isArray(focusPlaces) ? focusPlaces : []
  if (focus.length === 0) return false
  if (Array.isArray(mentionedFocusIds) && mentionedFocusIds.length > 0) return false

  const q = normalizeText(question)
  if (!q) return false

  // Pronouns like "địa điểm đó / chỗ đó" mean a follow-up even if the sentence is long.
  const pronouns = ['cho do', 'cho nay', 'noi do', 'o do', 'o day', 'dia diem do', 'dia diem nay']
  const hasPronoun = pronouns.some(k => q.includes(k))
  if (hasPronoun) return true

  const isShort = q.length <= 50 || q.split(' ').length <= 8
  if (!isShort) return false

  const followUpKeywords = [
    'may gio',
    'dong cua',
    'mo cua',
    'gio mo cua',
    'gio dong cua',
    'gia',
    'bao nhieu',
    'dia chi',
    'o dau',
    'duong di',
    'phu hop',
    'do tuoi',
    'tags',
    'tien ich',
    'an uong',
    'bai do xe'
  ]
  const hasKeyword = followUpKeywords.some(k => q.includes(k))
  return hasKeyword
}

const getOllamaTags = async (baseUrl) => {
  const now = Date.now()
  if (cachedOllamaTags && now - cachedOllamaTagsAt < OLLAMA_TAGS_TTL_MS) return cachedOllamaTags

  ensureFetch()

  try {
    const urlBase = String(baseUrl || '').replace(/\/$/, '')
    const res = await fetch(`${urlBase}/api/tags`)
    const data = await res.json().catch(() => null)
    const models = Array.isArray(data && data.models) ? data.models : []
    const names = models
      .map(m => (m && m.name ? String(m.name) : ''))
      .filter(Boolean)

    cachedOllamaTags = names
    cachedOllamaTagsAt = now
    return cachedOllamaTags
  } catch {
    cachedOllamaTags = null
    cachedOllamaTagsAt = now
    return null
  }
}

const resolveOllamaModel = async (baseUrl, requestedModel) => {
  const requested = normalizeModelName(requestedModel) || 'llama3'
  const tags = await getOllamaTags(baseUrl)
  if (!Array.isArray(tags) || tags.length === 0) return requested

  const lowerTags = tags.map(t => String(t).toLowerCase())
  const tagSet = new Set(lowerTags)

  const candidates = []
  candidates.push(requested)
  if (!requested.includes(':')) candidates.push(`${requested}:latest`)
  else candidates.push(requested.split(':')[0])
  candidates.push('llama3', 'llama3:latest')

  for (const candidate of candidates) {
    const c = normalizeModelName(candidate)
    if (!c) continue

    const lc = c.toLowerCase()
    if (tagSet.has(lc)) return c

    if (!c.includes(':')) {
      const idx = lowerTags.findIndex(t => t.startsWith(`${lc}:`))
      if (idx >= 0) return tags[idx]
    }
  }

  return requested
}

const buildPlaceLines = (place) => {
  const lines = ['Loại: Địa điểm']

  if (place.name) lines.push(`Tên: ${place.name}`)
  if (place.address) lines.push(`Địa chỉ: ${place.address}`)
  if (place.description) lines.push(`Mô tả: ${place.description}`)
  if (place.ageRange) lines.push(`Độ tuổi phù hợp: ${place.ageRange}`)
  if (place.price) lines.push(`Giá: ${place.price}`)
  if (place.rating != null) lines.push(`Đánh giá: ${place.rating}`)
  if (Array.isArray(place.openingHours) && place.openingHours.length > 0) {
    lines.push(`Giờ mở cửa: ${place.openingHours.join('; ')}`)
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

const buildDocuments = async (Document) => {
  const [places, reviews] = await Promise.all([
    Place.find({}).lean(),
    Review.find({}).populate('place', 'name lat lng').lean()
  ])

  const documents = []

  for (const place of places) {
    const lines = buildPlaceLines(place)
    if (lines.length > 1) {
      documents.push(new Document({
        pageContent: lines.join('\n'),
        metadata: {
          type: 'place',
          id: place._id ? String(place._id) : '',
          placeId: place.placeId || '',
          placeMongoId: place._id ? String(place._id) : '',
          placeName: place.name || '',
          lat: place.lat,
          lng: place.lng,
          tags: Array.isArray(place.tags) ? place.tags.map(t => String(t || '').trim()).filter(Boolean) : [],
          tagsNorm: Array.isArray(place.tags) ? place.tags.map(t => normalizeText(t)).filter(Boolean) : []
        }
      }))
    }
  }

  for (const review of reviews) {
    const lines = buildReviewLines(review)
    if (lines.length > 1) {
      documents.push(new Document({
        pageContent: lines.join('\n'),
        metadata: {
          type: 'review',
          id: review._id ? String(review._id) : '',
          placeId: review.place ? String(review.place._id || '') : '',
          placeMongoId: review.place && review.place._id ? String(review.place._id) : '',
          placeName: review.place && review.place.name ? String(review.place.name) : '',
          lat: review.place && typeof review.place.lat === 'number' ? review.place.lat : undefined,
          lng: review.place && typeof review.place.lng === 'number' ? review.place.lng : undefined
        }
      }))
    }
  }

  return documents
}

const getVectorStore = async () => {
  const now = Date.now()
  if (cachedStore && now - cachedAt < CACHE_TTL_MS) return cachedStore

  const { OllamaEmbeddings, MemoryVectorStore, Document } = await loadLangchain()
  const documents = await buildDocuments(Document)

  cachedAt = now
  if (documents.length === 0) {
    cachedStore = null
    return null
  }

  const baseUrl = getOllamaBaseUrl()
  const embedModel = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
  const embeddings = new OllamaEmbeddings({ baseUrl, model: embedModel })

  cachedStore = await MemoryVectorStore.fromDocuments(documents, embeddings)
  return cachedStore
}

const normalizeNoDataResponse = (text) => {
  const trimmed = String(text || '').trim()
  const normalized = trimmed
    .replace(/^[\s"'“”‘’]+/, '')
    .replace(/[\s"'“”‘’]+$/, '')
    .replace(/[.!?。！？]+$/g, '')
    .trim()
  return normalized === NO_DATA_RESPONSE ? NO_DATA_RESPONSE : trimmed
}

const extractMessageContent = (raw) => {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (raw.content != null) return String(raw.content)
  return ''
}

const coerceYesNo = (text) => {
  const t = String(text || '').trim().toUpperCase()
  if (t.startsWith('YES')) return 'YES'
  if (t.startsWith('NO')) return 'NO'
  return 'NO'
}

const classifyQuestionRelation = async ({
  chat,
  PromptTemplate,
  SystemMessage,
  HumanMessage,
  historyText,
  question
}) => {
  const template = new PromptTemplate({
    inputVariables: ['history', 'question'],
    template: [
      'LỊCH SỬ HỘI THOẠI:',
      '{history}',
      '',
      'CÂU HỎI MỚI:',
      '{question}',
      '',
      'TRẢ LỜI:'
    ].join('\n')
  })

  const system = new SystemMessage([
    'Xác định xem câu hỏi mới có liên quan đến lịch sử hội thoại trước đó hay không.',
    '',
    'Quy tắc:',
    '- Nếu câu hỏi mới là câu hỏi tiếp theo (follow-up), liên quan đến thông tin trước đó → trả lời: YES',
    '- Nếu câu hỏi là chủ đề mới, không liên quan → trả lời: NO',
    '',
    'Chỉ trả lời DUY NHẤT một từ:',
    'YES',
    'hoặc',
    'NO',
    '',
    'Không giải thích.'
  ].join('\n'))

  const human = new HumanMessage(await template.format({
    history: historyText || '(trống)',
    question
  }))

  const result = await chat.invoke([system, human])
  return coerceYesNo(extractMessageContent(result))
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
  const norms = tags
    .map(t => normalizeText(t && t.name ? t.name : ''))
    .filter(Boolean)

  cachedTagNorms = norms
  cachedTagNormsAt = now
  return cachedTagNorms
}

const extractTagsFromQuestion = async (question) => {
  const q = normalizeText(question)
  if (!q) return []

  const tagNorms = await getTagNorms()
  if (!Array.isArray(tagNorms) || tagNorms.length === 0) return []

  const matched = tagNorms.filter(tagNorm => q.includes(tagNorm))
  return Array.from(new Set(matched))
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

const isSwimmingIntent = (question) => {
  const q = normalizeText(question)
  return /(^|\s)(boi|di boi|ho boi|be boi|boi loi|cong vien nuoc|water park|waterpark|swimming|swim)(\s|$)/.test(q)
}

const getLinkedPlacesFromDocs = (docs, answer, limit = 3) => {
  const answerNorm = normalizeText(answer)
  const map = new Map()
  for (const doc of Array.isArray(docs) ? docs : []) {
    const meta = doc && doc.metadata ? doc.metadata : {}
    const id = meta.placeMongoId ? String(meta.placeMongoId) : ''
    const name = meta.placeName ? String(meta.placeName) : ''
    if (!id || !name || map.has(id)) continue
    const nameNorm = normalizeText(name)
    const mentioned = nameNorm && answerNorm.includes(nameNorm)
    map.set(id, { id, name, path: `/place/${id}`, mentioned })
  }

  const items = Array.from(map.values())
  const mentioned = items.filter(item => item.mentioned)
  return (mentioned.length > 0 ? mentioned : items).slice(0, limit).map(({ mentioned, ...item }) => item)
}

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
  const projection = 'name address ageRange price openingHours parking food facilities tags'

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

const getDirectRecommendation = async (question) => {
  const q = normalizeText(question)

  if (isSwimmingIntent(question)) {
    const places = await Place.find({
      tags: { $in: [/^Bơi lội$/i, /^Công viên nước$/i] }
    }, 'name price tags rating viewCount').limit(20).lean()

    places.sort((a, b) => {
      const aTags = (a.tags || []).map(normalizeText)
      const bTags = (b.tags || []).map(normalizeText)
      const score = (place, tags) => {
        let total = 0
        if (tags.includes('gan ha noi')) total += 100
        if (tags.includes('cong vien nuoc')) total += 50
        total += Number(place.rating || 0)
        total += Math.min(Number(place.viewCount || 0), 1000) / 1000
        return total
      }
      return score(b, bTags) - score(a, aTags)
    })

    const linkedPlaces = places.slice(0, 3).map(placeLinkPayload).filter(Boolean)
    if (linkedPlaces.length === 0) return { answer: NO_DATA_RESPONSE, places: [] }

    const names = linkedPlaces.map(p => p.name).join(', ')
    return {
      answer: `Bạn có thể đi bơi ở ${names}. Đây là các địa điểm có hoạt động bơi lội hoặc công viên nước.`,
      places: linkedPlaces
    }
  }

  if (!/(^|\s)(mien phi|free|khong mat phi)(\s|$)/.test(q)) return null

  const places = await Place.find({
    $or: [
      { price: { $regex: 'miễn phí', $options: 'i' } },
      { price: { $regex: '^\\s*free\\s*$', $options: 'i' } },
      { price: { $regex: '^\\s*0\\s*(đ|vnd)?\\s*$', $options: 'i' } }
    ]
  }, 'name price tags rating viewCount').sort({ rating: -1, viewCount: -1 }).limit(3).lean()

  const linkedPlaces = places.map(placeLinkPayload).filter(Boolean)
  if (linkedPlaces.length === 0) return { answer: NO_DATA_RESPONSE, places: [] }

  const names = linkedPlaces.map(p => p.name).join(', ')
  return {
    answer: `Bạn có thể tham khảo các địa điểm miễn phí như ${names}.`,
    places: linkedPlaces
  }
}

const rewriteQueryIfNeeded = async ({
  chat,
  PromptTemplate,
  SystemMessage,
  HumanMessage,
  historyText,
  focusText,
  question
}) => {
  const template = new PromptTemplate({
    inputVariables: ['history', 'focus', 'question'],
    template: [
      'FOCUS (cac dia diem dang duoc nhac toi):',
      '{focus}',
      '',
      'HISTORY (hoi thoai gan nhat):',
      '{history}',
      '',
      'CAU HOI HIEN TAI:',
      '{question}',
      '',
      'HAY VIET LAI CAU HOI THANH DAY DU, RO DOI TUONG (chi tra ve 1 cau hoi, khong giai thich):'
    ].join('\n')
  })

  const system = new SystemMessage([
    'Ban la he thong query rewrite cho RAG.',
    'Muc tieu: neu cau hoi mo ho (vd: "may gio dong cua"), hay viet lai thanh cau hoi day du dua tren HISTORY/FOCUS.',
    'QUY TAC BAT BUOC:',
    '- Chi duoc dung TEN dia diem co trong HISTORY hoac FOCUS. Khong duoc them dia diem moi.',
    `- Neu khong xac dinh duoc dia diem/doi tuong tu HISTORY/FOCUS, tra ve dung 3 tu: ${NO_DATA_RESPONSE}`,
    '- Neu cau hoi da ro doi tuong, giu nguyen y nghia va lam ro neu can.',
    '- Chi tra ve 1 cau hoi (1 dong), khong them bat ky noi dung nao khac.'
  ].join('\n'))

  const human = new HumanMessage(await template.format({
    history: historyText || '(trong)',
    focus: focusText || '(trong)',
    question
  }))

  const result = await chat.invoke([system, human])
  const text = extractMessageContent(result)
  const firstLine = String(text || '').split('\n')[0].trim()
  return normalizeNoDataResponse(firstLine)
}

const generateAnswerWithHistory = async ({
  chat,
  PromptTemplate,
  SystemMessage,
  HumanMessage,
  historyText,
  focusText,
  context,
  question
}) => {
  const template = new PromptTemplate({
    inputVariables: ['history', 'focus', 'context', 'question'],
    template: [
      'CONTEXT:',
      '{context}',
      '',
      'HISTORY:',
      '{history}',
      '',
      'CÂU HỎI:',
      '{question}',
      '',
      'TRẢ LỜI:'
    ].join('\n')
  })

  const system = new SystemMessage([
    `
You are a tourism place recommendation chatbot.
Reply politely, naturally, and in complete Vietnamese sentences.

HARD RULES:
1. Use only the provided CONTEXT.
2. Do not use outside knowledge.
3. If there is no suitable data, reply exactly: ${NO_DATA_RESPONSE}
4. Do not use superlatives such as "best", "top", or "ideal".
5. Always answer in Vietnamese.

CONTEXT HANDLING:
- Treat each new user message as a fresh request by default.
- Use HISTORY only when the current message clearly depends on the previous turn.
- Typical dependent follow-ups include: "còn chỗ nào khác không", "thế còn", "gần đó", "nó", "địa điểm đó", "loại khác", "nơi khác".
- If the user returns to an old topic after several unrelated turns, do NOT keep the old place fixed. Treat it as a new request unless the user explicitly refers back to it.
- If the user asks for another place in the same category, search CONTEXT for a different recommendation in that category and answer naturally.
- If the category is unclear, infer only from the most recent relevant turn. Do not search the entire history for a different topic.

ANSWER STYLE:
- Vietnamese only.
- Use 1–3 short sentences.
- If there is one result, write one complete sentence.
- If there are multiple results, write one short intro sentence plus bullet points.
- Do not mention CONTEXT, HISTORY, or internal rules in the reply.
`].join('\n'))

  const human = new HumanMessage(await template.format({
    history: historyText || '(trong)',
    focus: focusText || '(trong)',
    context,
    question
  }))

  const result = await chat.invoke([system, human])
  return normalizeNoDataResponse(extractMessageContent(result))
}

const answerQuestion = async (question, conversationId, userLocation) => {
  const sanitized = String(question || '').trim()
  const cid = getConversationId(conversationId)
  if (!sanitized) return { answer: NO_DATA_RESPONSE, conversationId: cid }

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
    if (directAnswer !== NO_DATA_RESPONSE) {
      session.focusPlaces = placeToFocus(directPlace)
    }
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

  const store = await getVectorStore()
  if (!store) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
    return { answer: NO_DATA_RESPONSE, conversationId: cid }
  }

  const { ChatOllama, PromptTemplate, SystemMessage, HumanMessage } = await loadLangchain()

  const baseUrl = getOllamaBaseUrl()
  const requestedModel = process.env.OLLAMA_MODEL || 'llama3'
  const resolvedModel = await resolveOllamaModel(baseUrl, requestedModel)

  const answerNumPredict = Number.isFinite(DEFAULT_NUM_PREDICT) && DEFAULT_NUM_PREDICT > 0 ? DEFAULT_NUM_PREDICT : 256
  const rewriteNumPredict = Number.isFinite(DEFAULT_REWRITE_NUM_PREDICT) && DEFAULT_REWRITE_NUM_PREDICT > 0 ? DEFAULT_REWRITE_NUM_PREDICT : 96

  const answerChat = new ChatOllama({ baseUrl, model: resolvedModel, temperature: 0, numPredict: answerNumPredict })
  const rewriteChat = new ChatOllama({ baseUrl, model: resolvedModel, temperature: 0, numPredict: rewriteNumPredict })
  const relationChat = new ChatOllama({ baseUrl, model: resolvedModel, temperature: 0, numPredict: 8 })

  const focusText = focusPlaces.map(p => p && p.placeName ? String(p.placeName) : '').filter(Boolean).join(', ')

  const relation = await classifyQuestionRelation({
    chat: relationChat,
    PromptTemplate,
    SystemMessage,
    HumanMessage,
    historyText,
    question: sanitized
  })

  const isFollowUp = relation === 'YES'

  const normalizedQuestion = normalizeText(sanitized)
  const focusMentioned = mentionedFocusIds.length > 0
  let shouldReset = false
  if (!isFollowUp) shouldReset = true
  if (!isFollowUp && focusPlaces.length > 0 && !focusMentioned) shouldReset = true

  if (shouldReset) {
    session.messages = []
    session.focusPlaces = []
  }

  const effectiveHistoryText = (isFollowUp && !shouldReset) ? historyText : ''
  const effectiveFocusPlaces = (isFollowUp && !shouldReset) ? focusPlaces : []
  const effectiveFocusText = effectiveFocusPlaces
    .map(p => p && p.placeName ? String(p.placeName) : '')
    .filter(Boolean)
    .join(', ')

  let rewrittenQuestion = sanitized
  if (ambiguous && isFollowUp && !shouldReset) {
    const rewritten = await rewriteQueryIfNeeded({
      chat: rewriteChat,
      PromptTemplate,
      SystemMessage,
      HumanMessage,
      historyText: effectiveHistoryText,
      focusText: effectiveFocusText,
      question: sanitized
    })
    if (rewritten === NO_DATA_RESPONSE) {
      pushSessionMessage(session, 'user', sanitized)
      pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
      return { answer: NO_DATA_RESPONSE, conversationId: cid }
    }

    // Guard: rewritten query must still reference at least one focus place.
    const rewriteNorm = normalizeText(rewritten)
    const hasFocusMention = effectiveFocusPlaces.some(p => p && p.nameNorm && rewriteNorm.includes(p.nameNorm))
    if (!hasFocusMention) {
      pushSessionMessage(session, 'user', sanitized)
      pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
      return { answer: NO_DATA_RESPONSE, conversationId: cid }
    }
    rewrittenQuestion = rewritten
  }

  // Keep context consistent only for follow-ups or when user mentions a focus place.
  let filterIds = []
  if (mentionedFocusIds.length > 0) {
    filterIds = mentionedFocusIds
  } else if (ambiguous && isFollowUp && effectiveFocusPlaces.length > 0) {
    filterIds = effectiveFocusPlaces.map(p => (p && p.placeMongoId ? String(p.placeMongoId) : '')).filter(Boolean)
  }

  const filterSet = new Set(filterIds)
  const tagFilters = await extractTagsFromQuestion(rewrittenQuestion)
  const tagFilterSet = new Set(tagFilters)
  const filterFn = (filterSet.size > 0 || tagFilterSet.size > 0)
    ? (doc) => {
        const meta = doc && doc.metadata ? doc.metadata : {}
        const pid = meta.placeMongoId ? String(meta.placeMongoId) : ''
        const tagsNorm = Array.isArray(meta.tagsNorm) ? meta.tagsNorm : []
        if (filterSet.size > 0 && (!pid || !filterSet.has(pid))) return false
        if (tagFilterSet.size > 0 && !tagsNorm.some(t => tagFilterSet.has(t))) return false
        return true
      }
    : undefined

  const topK = 3
  const retriever = store.asRetriever({ k: topK, filter: filterFn })
  let docs = await retriever.invoke(rewrittenQuestion)
  if (!docs || docs.length === 0) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
    return { answer: NO_DATA_RESPONSE, conversationId: cid }
  }

  const hasHardFilter = filterSet.size > 0 || tagFilterSet.size > 0 || (ambiguous && isFollowUp)
  if (!hasRelevantContext(rewrittenQuestion, docs, { hasHardFilter })) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
    return { answer: NO_DATA_RESPONSE, conversationId: cid }
  }

  let origin = extractLatLng(rewrittenQuestion)
  if (!origin && userLocation && typeof userLocation === 'object') {
    const lat = Number(userLocation.lat)
    const lng = Number(userLocation.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      origin = { lat, lng }
    }
  }
  if (origin) {
    docs = docs
      .map(d => {
        const meta = d && d.metadata ? d.metadata : {}
        const lat = typeof meta.lat === 'number' ? meta.lat : null
        const lng = typeof meta.lng === 'number' ? meta.lng : null
        const distanceKm = lat != null && lng != null
          ? haversineKm(origin.lat, origin.lng, lat, lng)
          : null
        return { doc: d, distanceKm }
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm
      })
      .map(item => {
        const meta = item.doc && item.doc.metadata ? item.doc.metadata : {}
        if (item.distanceKm != null) {
          meta.distanceKm = item.distanceKm
        }
        item.doc.metadata = meta
        return item.doc
      })
  }

  if (CONTEXT_MAX_DOCS > 0 && docs.length > CONTEXT_MAX_DOCS) {
    docs = docs.slice(0, CONTEXT_MAX_DOCS)
  }

  const context = docs
    .map(d => {
      const content = d.pageContent ? String(d.pageContent) : ''
      const meta = d && d.metadata ? d.metadata : {}
      const distance = Number.isFinite(meta.distanceKm) ? meta.distanceKm : null
      if (!content) return ''
      if (distance == null) return content
      return `${content}\nKhoang cach (km): ${distance.toFixed(2)}`
    })
    .filter(Boolean)
    .join('\n\n')
  if (!context.trim()) {
    pushSessionMessage(session, 'user', sanitized)
    pushSessionMessage(session, 'assistant', NO_DATA_RESPONSE)
    return { answer: NO_DATA_RESPONSE, conversationId: cid }
  }

  let answer
  try {
    answer = await generateAnswerWithHistory({
      chat: answerChat,
      PromptTemplate,
      SystemMessage,
      HumanMessage,
      historyText: effectiveHistoryText,
      focusText: filterSet.size > 0
        ? effectiveFocusPlaces
            .filter(p => p && p.placeMongoId && filterSet.has(String(p.placeMongoId)))
            .map(p => String(p.placeName || ''))
            .filter(Boolean)
            .join(', ')
        : effectiveFocusText,
      context,
      question: rewrittenQuestion
    })
  } catch (err) {
    const status = err && err.response && err.response.status
    if (status === 404) {
      const fallbackModel = await resolveOllamaModel(baseUrl, 'llama3')
      const fallbackChat = new ChatOllama({ baseUrl, model: fallbackModel, temperature: 0, numPredict: answerNumPredict })
      answer = await generateAnswerWithHistory({
        chat: fallbackChat,
        PromptTemplate,
        SystemMessage,
        HumanMessage,
        historyText: effectiveHistoryText,
        focusText: effectiveFocusText,
        context,
        question: rewrittenQuestion
      })
    } else {
      throw err
    }
  }

  const finalAnswer = normalizeNoDataResponse(answer)

  pushSessionMessage(session, 'user', sanitized)
  pushSessionMessage(session, 'assistant', finalAnswer)

  // Update focus from retrieved docs + answer mention (helps follow-up retrieval stay consistent)
  if (finalAnswer !== NO_DATA_RESPONSE) {
    const candidatesMap = new Map()
    for (const d of docs) {
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
    const answerNorm = normalizeText(finalAnswer)
    const mentioned = candidates.filter(c => c.nameNorm && answerNorm.includes(c.nameNorm))
    const nextFocus = (mentioned.length > 0 ? mentioned : candidates).slice(0, 3)
    session.focusPlaces = nextFocus
  }

  const linkedPlaces = finalAnswer !== NO_DATA_RESPONSE ? getLinkedPlacesFromDocs(docs, finalAnswer) : []

  return { answer: finalAnswer, conversationId: cid, places: linkedPlaces }
}

module.exports = {
  answerQuestion,
  NO_DATA_RESPONSE
}
