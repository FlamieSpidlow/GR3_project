const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) throw new Error('MONGO_URI is required')

  await mongoose.connect(mongoUri)

  const users = mongoose.connection.collection('users')
  const result = await users.updateMany(
    { numberOfKids: { $exists: true } },
    { $unset: { numberOfKids: '' } }
  )

  console.log(`Matched ${result.matchedCount || 0} user(s).`)
  console.log(`Removed numberOfKids from ${result.modifiedCount || 0} user(s).`)

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
