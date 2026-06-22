const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const Tag = require('../models/Tag')

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI is required')

  await mongoose.connect(mongoUri)

  await Tag.updateMany(
    {},
    { $unset: { description: '', image: '', featured: '', sortOrder: '' } }
  )

  console.log('Cleaned legacy tag fields.')

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
