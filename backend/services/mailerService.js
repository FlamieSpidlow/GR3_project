const nodemailer = require('nodemailer')

const getFromEmail = () => process.env.FROM_EMAIL || process.env.SMTP_USER

const getSmtpTransportConfig = () => {
  const host = process.env.SMTP_HOST
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = getFromEmail()
  if (!host || !user || !pass || !from) return null
  return {
    transport: {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    },
    from
  }
}

const sendWithSmtp = async ({ from, to, subject, text, html, attachments = [] }) => {
  const config = getSmtpTransportConfig()
  if (!config) return null

  const transporter = nodemailer.createTransport(config.transport)
  return transporter.sendMail({
    from: from || config.from,
    to,
    subject,
    text,
    html,
    attachments
  })
}

async function sendEmail({ from = getFromEmail(), to, subject, text, html, attachments = [] }) {
  if (!from) {
    console.warn('Email sender not configured - skip email')
    return false
  }

  const smtpResult = await sendWithSmtp({ from, to, subject, text, html, attachments })
  if (!smtpResult) {
    console.warn('SMTP not configured - skip email')
    return false
  }
  return true
}

module.exports = {
  getFromEmail,
  getSmtpTransportConfig,
  sendEmail
}
