require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const HomeContent = require('../models/HomeContent')

const items = [
  {
    type: 'explore',
    title: 'Vui chơi không phụ thuộc thời tiết',
    badge: 'Trong nhà',
    description: 'Nhà bóng, trò chơi vận động và khu giải trí trong trung tâm thương mại.',
    placeKeyword: 'tiNiWorld',
    sortOrder: 10
  },
  {
    type: 'explore',
    title: 'Một ngày xanh cho cả nhà',
    badge: 'Ngoài trời',
    description: 'Công viên, không gian xanh và điểm dã ngoại để trẻ vận động nhiều hơn.',
    placeKeyword: 'Công viên',
    sortOrder: 20
  },
  {
    type: 'explore',
    title: 'Học mà chơi',
    badge: 'Giáo dục',
    description: 'Bảo tàng và không gian trải nghiệm giúp trẻ quan sát, đặt câu hỏi và khám phá.',
    placeKeyword: 'Bảo tàng',
    sortOrder: 30
  },
  {
    type: 'offer',
    title: 'Gợi ý vui chơi trong nhà khi trời mưa',
    dateLabel: 'Cuối tuần',
    description: 'Danh sách địa điểm trong nhà phù hợp cho trẻ em và gia đình.',
    link: '/search?query=khu%20vui%20ch%C6%A1i%20trong%20nh%C3%A0',
    sortOrder: 10
  },
  {
    type: 'offer',
    title: 'Một ngày năng động ở công viên nước',
    dateLabel: 'Mùa hè',
    description: 'Chọn các điểm vui chơi nước có không gian nghỉ và hoạt động cho trẻ.',
    link: '/search?query=c%C3%B4ng%20vi%C3%AAn%20n%C6%B0%E1%BB%9Bc',
    sortOrder: 20
  },
  {
    type: 'offer',
    title: 'Lịch trình nửa ngày cho trẻ thích khám phá',
    dateLabel: 'Gia đình',
    description: 'Kết hợp bảo tàng, không gian xanh và địa điểm ăn uống gần khu vui chơi.',
    link: '/places',
    sortOrder: 30
  }
]

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI is required')

  await mongoose.connect(mongoUri)

  for (const item of items) {
    await HomeContent.updateOne(
      { type: item.type, title: item.title },
      { $set: { ...item, active: true } },
      { upsert: true }
    )
  }

  await HomeContent.deleteMany({ type: { $nin: ['explore', 'offer'] } })

  console.log(`Seeded ${items.length} home content items.`)
  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect()
  process.exit(1)
})
