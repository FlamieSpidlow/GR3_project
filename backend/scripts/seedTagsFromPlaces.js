require('dotenv').config()
const mongoose = require('mongoose')
const Place = require('../models/Place')
const Tag = require('../models/Tag')

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

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/theweekend'
  await mongoose.connect(uri)

  const places = await Place.find({ tags: { $exists: true, $ne: [] } }, { tags: 1 }).lean()
  const tagSet = new Map()

  for (const place of places) {
    const tags = Array.isArray(place.tags) ? place.tags : []
    for (const tag of tags) {
      const name = String(tag || '').trim()
      if (!name) continue
      const nameNorm = normalizeText(name)
      if (!nameNorm) continue
      if (!tagSet.has(nameNorm)) tagSet.set(nameNorm, name)
    }
  }

  const ops = []
  for (const [nameNorm, name] of tagSet.entries()) {
    ops.push({
      updateOne: {
        filter: { nameNorm },
        update: { $setOnInsert: { name, nameNorm } },
        upsert: true
      }
    })
  }

  if (ops.length > 0) {
    await Tag.bulkWrite(ops, { ordered: false })
  }

  console.log(`Seeded tags: ${ops.length}`)
  await mongoose.disconnect()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
