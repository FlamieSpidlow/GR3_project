const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config()
const authRoutes = require('./routes/auth')
const placesRoutes = require('./routes/places')
const adminRoutes = require('./routes/admin')
const reviewsRoutes = require('./routes/reviews')
const chatbotRoutes = require('./routes/chatbot')
const tagsRoutes = require('./routes/tags')
const categoriesRoutes = require('./routes/categories')
const homeContentRoutes = require('./routes/homeContent')
const ticketsRoutes = require('./routes/tickets')
const notificationsRoutes = require('./routes/notifications')
const cors = require('cors')

// Check if Goong API key is loaded
const GOONG_API_KEY = process.env.GOONG_API_KEY
if (GOONG_API_KEY) {
  console.log('Goong API Key loaded: ' + GOONG_API_KEY.substring(0, 10) + '...')
} else {
  console.warn('Goong API Key NOT configured - set GOONG_API_KEY in .env')
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Serve static files from uploads folder
app.use('/uploads', express.static('uploads'))

app.use('/api/auth', authRoutes)
app.use('/api/places', placesRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/reviews', reviewsRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/tags', tagsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/home-content', homeContentRoutes)
app.use('/api/tickets', ticketsRoutes)
app.use('/api/notifications', notificationsRoutes)

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(frontendDist))
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(frontendDist, 'index.html'))
})

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  throw new Error('MONGO_URI is required in backend/.env')
}

mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err))

// Increase header size limit to avoid 431 errors with large auth/session headers.
const http = require('http')
const server = http.createServer({
  maxHeaderSize: 65536
}, app)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`))


