const express = require('express')
const mongoose = require('mongoose')
const authRoutes = require('./routes/auth')
const placesRoutes = require('./routes/places')
const adminRoutes = require('./routes/admin')
const reviewsRoutes = require('./routes/reviews')
const chatbotRoutes = require('./routes/chatbot')
const tagsRoutes = require('./routes/tags')
const cors = require('cors')
require('dotenv').config()

// Debug: Check if Goong API key is loaded
const GOONG_API_KEY = process.env.GOONG_API_KEY
if (GOONG_API_KEY) {
  console.log('✅ Goong API Key loaded: ' + GOONG_API_KEY.substring(0, 10) + '...')
} else {
  console.warn('❌ Goong API Key NOT configured - set GOONG_API_KEY in .env')
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

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/theweekend', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Kết nối MongoDB thành công'))
.catch(err => console.error('❌ Lỗi kết nối MongoDB:', err))

// Tăng giới hạn header size để tránh lỗi 431
const http = require('http')
const server = http.createServer({
  maxHeaderSize: 65536 // 64KB thay vì mặc định 16KB
}, app)

server.listen(3000, () => console.log('🚀 Server chạy tại http://localhost:3000'))