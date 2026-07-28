const express = require('express')
const router = express.Router()
const { answerQuestion, NO_DATA_RESPONSE } = require('../services/chatbotService')

router.post('/', async (req, res) => {
  try {
    const { question, conversationId, userLocation } = req.body || {}
    const result = await answerQuestion(question, conversationId, userLocation)
    const answer = result && typeof result.answer === 'string' ? result.answer : NO_DATA_RESPONSE
    const cid = result && result.conversationId ? String(result.conversationId) : (conversationId ? String(conversationId) : 'default')
    const places = result && Array.isArray(result.places) ? result.places : []
    const suggestions = result && Array.isArray(result.suggestions) ? result.suggestions : []
    res.json({ success: true, answer, conversationId: cid, places, suggestions })
  } catch (err) {
    console.error('Chatbot error:', err)
    res.status(500).json({ success: false, error: 'Lỗi chatbot', answer: NO_DATA_RESPONSE })
  }
})


module.exports = router
