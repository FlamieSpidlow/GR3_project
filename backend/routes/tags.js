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

    res.json({ success: true, data })
  } catch (err) {
    console.error('Get activity tags error:', err)
    res.status(500).json({ success: false, error: 'Loi lay danh sach hoat dong', details: err.message })
  }
})

module.exports = router
