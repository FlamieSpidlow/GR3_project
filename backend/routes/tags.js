const express = require('express')
const Tag = require('../models/Tag')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find({}).sort({ name: 1 })
    res.json({ success: true, data: tags })
  } catch (err) {
    console.error('Get tags error:', err)
    res.status(500).json({ success: false, error: 'Loi lay danh sach tags', details: err.message })
  }
})

module.exports = router
