const express = require('express')
const Tag = require('../models/Tag')

const router = express.Router()

const DEFAULT_ACTIVITIES = [
  { id: 'swimming', label: 'Bơi lội', description: '', image: '/activities/swimming.jpg', sortOrder: 1 },
  { id: 'climbing', label: 'Leo núi nhân tạo', description: '', image: '/activities/climbing.jpg', sortOrder: 2 },
  { id: 'animal-care', label: 'Chăm sóc thú', description: '', image: '/activities/animal-care.jpg', sortOrder: 3 },
  { id: 'thrill', label: 'Cảm giác mạnh', description: '', image: '/activities/thrill.jpg', sortOrder: 4 },
  { id: 'history', label: 'Lịch sử', description: '', image: '/activities/history.jpg', sortOrder: 5 },
  { id: 'picnic', label: 'Picnic', description: '', image: '/activities/picnic.jpg', sortOrder: 6 },
  { id: 'farm', label: 'Nông trại', description: '', image: '/activities/farm.jpg', sortOrder: 7 },
  { id: 'museum-explore', label: 'Bảo tàng', description: '', image: '/activities/museum-explore.jpg', sortOrder: 8 },
  { id: 'craft-village', label: 'Làng nghề & thủ công', description: '', image: '/activities/craft-village.jpg', sortOrder: 9 },
  { id: 'walking-checkin', label: 'Đi bộ & check-in', description: '', image: '/activities/walking-checkin.jpg', sortOrder: 10 },
  { id: 'performance', label: 'Biểu diễn nghệ thuật', description: '', image: '/activities/performance.jpg', sortOrder: 11 },
  { id: 'nature-explore', label: 'Thiên nhiên', description: '', image: '/activities/nature-explore.jpg', sortOrder: 12 }
]

router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find({}).sort({ name: 1 })
    res.json({ success: true, data: tags })
  } catch (err) {
    console.error('Get tags error:', err)
    res.status(500).json({ success: false, error: 'Loi lay danh sach tags', details: err.message })
  }
})

router.get('/activities', async (req, res) => {
  try {
    const tags = await Tag.find({ featured: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name description image sortOrder')
      .lean()

    const data = tags.map(tag => ({
      id: tag._id.toString(),
      label: tag.name,
      description: tag.description || '',
      image: tag.image || '/Playground.jpg',
      sortOrder: tag.sortOrder || 0
    }))

    res.json({ success: true, data: data.length > 0 ? data : DEFAULT_ACTIVITIES })
  } catch (err) {
    console.error('Get activity tags error:', err)
    res.status(500).json({ success: false, error: 'Loi lay danh sach hoat dong', details: err.message })
  }
})

module.exports = router
