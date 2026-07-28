const express = require('express')
const Tag = require('../models/Tag')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find({}).sort({ name: 1 })
    res.json({ success: true, data: tags })
  } catch (err) {
    console.error('Get tags error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách chủ đề', details: err.message })
  }
})

module.exports = router
