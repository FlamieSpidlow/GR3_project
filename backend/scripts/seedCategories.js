require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const Category = require('../models/Category')
const Place = require('../models/Place')

const normalizeText = (input) => String(input || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const categories = [
  {
    name: 'Khu vui chơi trong nhà',
    description: 'Nhà bóng, khu trò chơi trong trung tâm thương mại, khu vận động trong nhà',
    sortOrder: 10,
    keywords: ['trong nha', 'nha bong', 'indoor', 'tiniworld', 'kidzooona', 'playtime', 'wolfoo', 'jump arena', 'vietclimb', 'mall', 'center', 'trung tam thuong mai']
  },
  {
    name: 'Công viên & ngoài trời',
    description: 'Công viên, quảng trường, không gian vui chơi ngoài trời',
    sortOrder: 20,
    keywords: ['cong vien', 'park', 'vuon hoa', 'quang truong', 'ngoai troi', 'outdoor']
  },
  {
    name: 'Bơi lội & công viên nước',
    description: 'Bể bơi, hồ bơi, khu vui chơi nước',
    sortOrder: 30,
    keywords: ['boi', 'be boi', 'ho boi', 'cong vien nuoc', 'water park', 'aquapark', 'nuoc']
  },
  {
    name: 'Thiên nhiên & sinh thái',
    description: 'Không gian xanh, sinh thái, vườn cây, trải nghiệm thiên nhiên',
    sortOrder: 40,
    keywords: ['thien nhien', 'sinh thai', 'eco', 'ecopark', 'vuon', 'botanical', 'ba vi', 'rung']
  },
  {
    name: 'Nông trại',
    description: 'Nông trại trải nghiệm, làm vườn, chăm sóc cây và vật nuôi',
    sortOrder: 50,
    keywords: ['nong trai', 'farm', 'trang trai', 'de trang', 'rau', 'lam vuon']
  },
  {
    name: 'Bảo tàng & giáo dục',
    description: 'Bảo tàng, thư viện, không gian học tập và trải nghiệm giáo dục',
    sortOrder: 60,
    keywords: ['bao tang', 'museum', 'thu vien', 'khoa hoc', 'giao duc', 'sach', 'trai nghiem']
  },
  {
    name: 'Văn hóa & di tích',
    description: 'Di tích, làng nghề, không gian văn hóa và lịch sử',
    sortOrder: 70,
    keywords: ['van hoa', 'lich su', 'di tich', 'den', 'chua', 'lang', 'hoang thanh', 'temple', 'pagoda', 'heritage']
  },
  {
    name: 'Động vật & sở thú',
    description: 'Sở thú, thủy cung, khu quan sát và chăm sóc động vật',
    sortOrder: 80,
    keywords: ['dong vat', 'so thu', 'zoo', 'aquarium', 'thuy cung', 'safari', 'chim']
  },
  {
    name: 'Dã ngoại & picnic',
    description: 'Địa điểm phù hợp picnic, cắm trại, dã ngoại cuối tuần',
    sortOrder: 90,
    keywords: ['picnic', 'da ngoai', 'camping', 'cam trai']
  },
  {
    name: 'Giải trí gia đình',
    description: 'Địa điểm vui chơi tổng hợp cho gia đình và trẻ em',
    sortOrder: 100,
    keywords: ['giai tri', 'gia dinh', 'vui choi', 'tre em', 'kids']
  }
]

const categoryPriority = [
  'Khu vui chơi trong nhà',
  'Nông trại',
  'Động vật & sở thú',
  'Bơi lội & công viên nước',
  'Bảo tàng & giáo dục',
  'Dã ngoại & picnic',
  'Thiên nhiên & sinh thái',
  'Văn hóa & di tích',
  'Công viên & ngoài trời',
  'Giải trí gia đình'
]

const pickCategory = (place, categoryByNameNorm) => {
  const text = [
    place.name,
    place.address,
    place.description,
    ...(Array.isArray(place.types) ? place.types : [])
  ].map(normalizeText).filter(Boolean).join(' ')

  for (const categoryName of categoryPriority) {
    const category = categories.find(item => item.name === categoryName)
    if (!category) continue
    if (category.keywords.some(keyword => text.includes(normalizeText(keyword)))) {
      return categoryByNameNorm.get(normalizeText(category.name))
    }
  }

  return categoryByNameNorm.get(normalizeText('Giải trí gia đình'))
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
