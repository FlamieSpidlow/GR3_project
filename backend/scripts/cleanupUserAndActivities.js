const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const Activity = require('../models/Activity')
const Tag = require('../models/Tag')
const activities = require('../data/defaultActivities')

const normalizeText = (input) => String(input || '')
  .toLowerCase()
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI is required')

  await mongoose.connect(mongoUri)

  for (const [index, activity] of activities.entries()) {
    const nameNorm = normalizeText(activity.name)
    await Activity.updateOne(
      { nameNorm },
      {
        $set: {
          name: activity.name,
          nameNorm,
          image: activity.image,
          active: true,
          sortOrder: activity.sortOrder || index + 1
        },
        $setOnInsert: {
          description: ''
        }
      },
      { upsert: true }
    )
  }

  await Tag.updateMany(
    {},
    { $unset: { description: '', image: '', featured: '', sortOrder: '' } }
  )

  console.log(`Upserted ${activities.length} featured activity record(s).`)

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
