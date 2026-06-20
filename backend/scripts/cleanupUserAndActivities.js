const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const User = require('../models/User')
const Tag = require('../models/Tag')

const normalizeText = (input) => String(input || '')
  .toLowerCase()
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const activities = [
  { name: 'Bơi lội', image: '/activities/swimming.jpg' },
  { name: 'Leo núi nhân tạo', image: '/activities/climbing.jpg' },
  { name: 'Chăm sóc thú', image: '/activities/animal-care.jpg' },
  { name: 'Cảm giác mạnh', image: '/activities/thrill.jpg' },
  { name: 'Lịch sử', image: '/activities/history.jpg' },
  { name: 'Picnic', image: '/activities/picnic.jpg' },
  { name: 'Nông trại', image: '/activities/farm.jpg' },
  { name: 'Bảo tàng', image: '/activities/museum-explore.jpg' },
  { name: 'Làng nghề & thủ công', image: '/activities/craft-village.jpg' },
  { name: 'Đi bộ & check-in', image: '/activities/walking-checkin.jpg' },
  { name: 'Biểu diễn nghệ thuật', image: '/activities/performance.jpg' },
  { name: 'Thiên nhiên', image: '/activities/nature-explore.jpg' }
]

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI is required')

  await mongoose.connect(mongoUri)

  const userResult = await User.updateMany(
    { numberOfKids: { $exists: true } },
    { $unset: { numberOfKids: '' } }
  )

  for (const [index, activity] of activities.entries()) {
    const nameNorm = normalizeText(activity.name)
    await Tag.updateOne(
      { nameNorm },
      {
        $set: {
          name: activity.name,
          nameNorm,
          image: activity.image,
          featured: true,
          sortOrder: index + 1
        },
        $setOnInsert: {
          description: ''
        }
      },
      { upsert: true }
    )
  }

  console.log(`Removed numberOfKids from ${userResult.modifiedCount || 0} user(s).`)
  console.log(`Upserted ${activities.length} featured activity tag(s).`)

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
