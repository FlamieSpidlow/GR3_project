const express = require('express')
const router = express.Router()
const Category = require('../models/Category')

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean()

    res.json({ success: true, data: categories })
  } catch (err) {
    console.error('Get categories error:', err)
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách loại địa điểm', details: err.message })
  }
})

module.exports = router
