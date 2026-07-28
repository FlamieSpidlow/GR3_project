const express = require('express')
const router = express.Router()
const HomeContent = require('../models/HomeContent')

router.get('/', async (req, res) => {
  try {
    const items = await HomeContent.find({ active: true })
      .sort({ type: 1, sortOrder: 1, createdAt: 1 })
      .lean()

    res.json({
      success: true,
      data: {
        explore: items.filter(item => item.type === 'explore'),
        offers: items.filter(item => item.type === 'offer')
      }
    })
  } catch (err) {
    console.error('Get home content error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy nội dung trang chủ', details: err.message })
  }
})

module.exports = router
