const fetch = require('node-fetch')

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const getFromEmail = () => process.env.FROM_EMAIL || process.env.SMTP_USER
const getFromName = () => process.env.BREVO_SENDER_NAME || 'TheWeekend'

const sendWithBrevo = async ({ from, fromName, to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return null

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { name: fromName, email: from },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Brevo API error (${response.status}): ${body}`)
  }

  return response.json()
}

async function sendEmail({ from = getFromEmail(), to, subject, text, html }) {
  if (!from) {
    console.warn('Email sender not configured - skip email')
    return false
  }
  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not configured - skip email')
    return false
  }

  await sendWithBrevo({ from, fromName: getFromName(), to, subject, text, html })
  return true
}

module.exports = {
  getFromEmail,
  sendEmail
}
