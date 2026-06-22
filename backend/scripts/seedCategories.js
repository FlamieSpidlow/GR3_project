require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const Category = require('../models/Category')
const Place = require('../models/Place')

const normalizeText = (input) => String(input || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'd')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const categories = [
  {
    name: 'Khu vui chơi trong nhà',
    description: 'Nhà bóng, khu trò chơi trong trung tâm thương mại, khu vận động trong nhà',
    sortOrder: 10
  },
  {
    name: 'Công viên & ngoài trời',
    description: 'Công viên, quảng trường, không gian vui chơi ngoài trời',
    sortOrder: 20
  },
  {
    name: 'Bơi lội & công viên nước',
    description: 'Bể bơi, hồ bơi, khu vui chơi nước',
    sortOrder: 30
  },
  {
    name: 'Thiên nhiên & sinh thái',
    description: 'Không gian xanh, sinh thái, vườn cây, trải nghiệm thiên nhiên',
    sortOrder: 40
  },
  {
    name: 'Nông trại',
    description: 'Nông trại trải nghiệm, làm vườn, chăm sóc cây và vật nuôi',
    sortOrder: 50
  },
  {
    name: 'Bảo tàng & giáo dục',
    description: 'Bảo tàng, thư viện, không gian học tập và trải nghiệm giáo dục',
    sortOrder: 60
  },
  {
    name: 'Văn hóa & di tích',
    description: 'Di tích, làng nghề, không gian văn hóa và lịch sử',
    sortOrder: 70
  },
  {
    name: 'Động vật & sở thú',
    description: 'Sở thú, thủy cung, khu quan sát và chăm sóc động vật',
    sortOrder: 80
  },
  {
    name: 'Dã ngoại & picnic',
    description: 'Địa điểm phù hợp picnic, cắm trại, dã ngoại cuối tuần',
    sortOrder: 90
  },
  {
    name: 'Giải trí gia đình',
    description: 'Địa điểm vui chơi tổng hợp cho gia đình và trẻ em',
    sortOrder: 100
  }
]

const categoryNames = categories.map(category => category.name)

const rules = [
  {
    category: 'Bảo tàng & giáo dục',
    strong: ['bao tang', 'museum', 'vin ke', 'vinke', 'kidzenia', 'kidzania', 'kizciti', 'pho sach', 'thu vien', 'khoa hoc'],
    weak: ['giao duc', 'huong nghiep', 'my thuat', 'dan toc hoc']
  },
  {
    category: 'Động vật & sở thú',
    strong: ['thuy cung', 'aquarium', 'so thu', 'zoo', 'safari'],
    weak: ['thu le', 'chim', 'bird valley', 'dong vat', 'ao vua']
  },
  {
    category: 'Nông trại',
    strong: ['nong trai', 'trang trai', 'farm', 'erahouse', 'detrang'],
    weak: ['lam vuon', 'rau']
  },
  {
    category: 'Bơi lội & công viên nước',
    strong: ['cong vien nuoc', 'water park', 'waterfun', 'wave park', 'be boi', 'ho boi', 'vinwonders water', 'amazing bay'],
    weak: ['boi loi', 'boi', 'nuoc ho tay']
  },
  {
    category: 'Văn hóa & di tích',
    strong: ['lang gom', 'bat trang', 'duong lam', 'van mieu', 'hoang thanh', 'den ', 'chua ', 'co do', 'hoa lu', 'tam chuc', 'bai dinh', 'tay thien', 'lang van hoa', 'lang co', 'thanh co', 'di tich', 'lich su'],
    weak: ['van hoa', 'lang nghe', 'quoc tu giam', 'hoan kiem', 'ho guom']
  },
  {
    category: 'Thiên nhiên & sinh thái',
    strong: ['vuon quoc gia', 'ba vi', 'cuc phuong', 'xuan thuy', 'ham lon', 'tam coc', 'bich dong', 'hang mua', 'thung nham', 'dai lai', 'ho nui coc', 'moc chau', 'mai chau', 'vinh ha long', 'khoang xanh', 'suoi nga', 'tan da'],
    weak: ['thien nhien', 'sinh thai', 'ecopark', 'rung', 'vuon bach thao', 'dao co']
  },
  {
    category: 'Dã ngoại & picnic',
    strong: ['picnic', 'cam trai', 'camping', 'ban rom'],
    weak: ['da ngoai']
  },
  {
    category: 'Khu vui chơi trong nhà',
    strong: ['tiniworld', 'playtime', 'kidzooona', 'wolfoo', 'jump arena', 'vietclimb', 'ice rink', 'royal city', 'aeon mall', 'lotte mall', 'vincom', 'mega mall', 'mr haahoo'],
    weak: ['trong nha', 'nha bong', 'indoor', 'khu vui choi tre em']
  },
  {
    category: 'Công viên & ngoài trời',
    strong: ['cong vien', 'quang truong', 'flc sam son', 'tuan chau', 'ocean park', 'mat troi moi', 'yen so', 'hoa binh', 'nghia do', 'thong nhat', 'cau giay'],
    weak: ['ngoai troi', 'park']
  },
  {
    category: 'Giải trí gia đình',
    strong: ['thien duong bao son', 'mega grand world'],
    weak: ['giai tri', 'gia dinh', 'vui choi', 'tre em', 'kids']
  }
]

const manualRules = [
  ['bao tang', 'Bảo tàng & giáo dục'],
  ['thu vien', 'Bảo tàng & giáo dục'],
  ['pho sach', 'Bảo tàng & giáo dục'],
  ['vin ke', 'Bảo tàng & giáo dục'],
  ['vinke', 'Bảo tàng & giáo dục'],
  ['kizciti', 'Bảo tàng & giáo dục'],
  ['kidzania', 'Bảo tàng & giáo dục'],
  ['thuy cung', 'Động vật & sở thú'],
  ['aquarium', 'Động vật & sở thú'],
  ['so thu', 'Động vật & sở thú'],
  ['thu le', 'Động vật & sở thú'],
  ['nong trai', 'Nông trại'],
  ['trang trai', 'Nông trại'],
  ['farm', 'Nông trại'],
  ['cong vien nuoc', 'Bơi lội & công viên nước'],
  ['water park', 'Bơi lội & công viên nước'],
  ['waterfun', 'Bơi lội & công viên nước'],
  ['wave park', 'Bơi lội & công viên nước'],
  ['lang gom', 'Văn hóa & di tích'],
  ['bat trang', 'Văn hóa & di tích'],
  ['duong lam', 'Văn hóa & di tích'],
  ['van mieu', 'Văn hóa & di tích'],
  ['hoang thanh', 'Văn hóa & di tích'],
  ['den ', 'Văn hóa & di tích'],
  ['chua ', 'Văn hóa & di tích'],
  ['vuon quoc gia', 'Thiên nhiên & sinh thái'],
  ['tam coc', 'Thiên nhiên & sinh thái'],
  ['hang mua', 'Thiên nhiên & sinh thái'],
  ['vinh ha long', 'Thiên nhiên & sinh thái'],
  ['rap xiec', 'Giải trí gia đình'],
  ['thuy dien', 'Bảo tàng & giáo dục']
]

const addScore = (scores, category, value) => {
  scores[category] = (scores[category] || 0) + value
}

const includesPhrase = (text, phrase) => {
  const normalized = normalizeText(phrase)
  if (!normalized) return false
  return text.includes(normalized)
}

const pickCategory = (place, categoryByNameNorm) => {
  const nameText = normalizeText(place.name)
  const primaryText = [
    place.name,
    place.address,
    ...(Array.isArray(place.types) ? place.types : [])
  ].map(normalizeText).filter(Boolean).join(' ')
  const fullText = [
    primaryText,
    place.description
  ].map(normalizeText).filter(Boolean).join(' ')

  for (const [phrase, category] of manualRules) {
    if (includesPhrase(nameText, phrase)) {
      return categoryByNameNorm.get(normalizeText(category))
    }
  }

  const scores = Object.fromEntries(categoryNames.map(category => [category, 0]))

  for (const rule of rules) {
    for (const phrase of rule.strong) {
      if (includesPhrase(nameText, phrase)) addScore(scores, rule.category, 8)
      else if (includesPhrase(primaryText, phrase)) addScore(scores, rule.category, 4)
      else if (includesPhrase(fullText, phrase)) addScore(scores, rule.category, 1)
    }

    for (const phrase of rule.weak) {
      if (includesPhrase(nameText, phrase)) addScore(scores, rule.category, 3)
      else if (includesPhrase(primaryText, phrase)) addScore(scores, rule.category, 1)
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  const categoryName = best && best[1] > 0 ? best[0] : 'Giải trí gia đình'
  return categoryByNameNorm.get(normalizeText(categoryName))
}

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI is required')

  await mongoose.connect(mongoUri)

  for (const category of categories) {
    const nameNorm = normalizeText(category.name)
    await Category.updateOne(
      { nameNorm },
      {
        $set: {
          name: category.name,
          nameNorm,
          description: category.description,
          sortOrder: category.sortOrder,
          active: true
        }
      },
      { upsert: true }
    )
  }

  const savedCategories = await Category.find({}).lean()
  const categoryByNameNorm = new Map(savedCategories.map(category => [category.nameNorm, category._id]))
  const places = await Place.find({})
  let updated = 0

  for (const place of places) {
    const categoryId = pickCategory(place, categoryByNameNorm)
    if (!categoryId) continue
    if (!place.category || String(place.category) !== String(categoryId)) {
      place.category = categoryId
      await place.save()
      updated += 1
    }
  }

  console.log(`Seeded ${categories.length} categories. Updated ${updated}/${places.length} places.`)
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect()
  process.exit(1)
})
