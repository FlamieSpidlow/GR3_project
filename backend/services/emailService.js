const nodemailer = require('nodemailer')
const QRCode = require('qrcode')
const Booking = require('../models/Booking')
const Ticket = require('../models/Ticket')

const getTransportConfig = () => {
  const host = process.env.SMTP_HOST
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.FROM_EMAIL || user
  if (!host || !user || !pass || !from) return null
  return {
    transport: {
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    },
    from
  }
}

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(value || 0))

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatDateTime = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleString('vi-VN')
}

const buildTicketQrPayload = ({ booking, ticket }) => JSON.stringify({
  type: 'theweekend-ticket-confirmation',
  ticketCode: ticket.code,
  bookingCode: booking.code,
  bookingId: String(booking._id),
  customer: {
    name: booking.user?.parentName || booking.user?.username || '',
    email: booking.user?.email || '',
    phone: booking.user?.phone || ''
  },
  place: {
    name: booking.place?.name || '',
    address: booking.place?.address || ''
  },
  visitDate: booking.visitDate,
  ticket: {
    name: ticket.name || '',
    lineIndex: ticket.lineIndex,
    status: ticket.status
  },
  totalAmount: booking.totalAmount,
  paidAt: booking.paidAt
})

const createTicketQrAssets = async ({ booking, tickets }) => {
  const assets = []
  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index]
    const dataUrl = await QRCode.toDataURL(buildTicketQrPayload({ booking, ticket }), {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    const cid = `ticket-${ticket.code}@theweekend`
    assets.push({
      ticket,
      index,
      cid,
      attachment: {
        filename: `${ticket.code}.png`,
        content: Buffer.from(base64, 'base64'),
        contentType: 'image/png',
        cid
      }
    })
  }
  return assets
}

const buildTicketCards = (ticketAssets) => ticketAssets.map(({ ticket, index, cid }) => `
  <div style="display:flex;gap:16px;align-items:center;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:12px;">
    <img src="cid:${escapeHtml(cid)}" alt="QR ${escapeHtml(ticket.code)}" width="128" height="128" style="width:128px;height:128px;border:1px solid #e5e7eb;border-radius:8px;" />
    <div style="min-width:0;">
      <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Ve ${index + 1}</div>
      <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:6px;">${escapeHtml(ticket.code)}</div>
      <div style="color:#334155;margin-bottom:4px;">Loai ve: ${escapeHtml(ticket.name || 'Ve')}</div>
      <div style="color:#64748b;font-size:13px;">QR nay chua thong tin chi tiet don ve va nguoi dat.</div>
    </div>
  </div>
`).join('')

const buildTicketConfirmationHtml = ({ booking, tickets, ticketAssets }) => {
  const placeName = booking.place?.name || 'Dia diem'
  const customerName = booking.user?.parentName || booking.user?.username || 'ban'
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#0f766e;color:#ffffff;padding:22px 24px;">
          <h1 style="margin:0;font-size:22px;">Xac nhan dat ve thanh cong</h1>
          <p style="margin:8px 0 0;">Cam on ${escapeHtml(customerName)} da dat ve tren TheWeekend.</p>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 14px;font-size:18px;">Thong tin don ve</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
            <tr><td style="padding:8px 0;color:#64748b;">Ma don</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(booking.code)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Dia diem</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(placeName)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Ngay di</td><td style="padding:8px 0;text-align:right;">${escapeHtml(formatDate(booking.visitDate))}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">So luong ve</td><td style="padding:8px 0;text-align:right;">${booking.totalQuantity || tickets.length}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Tong tien</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(formatVnd(booking.totalAmount))}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Da thanh toan luc</td><td style="padding:8px 0;text-align:right;">${escapeHtml(formatDateTime(booking.paidAt))}</td></tr>
          </table>

          <h2 style="margin:0 0 12px;font-size:18px;">Ma ve dien tu va QR chi tiet</h2>
          ${buildTicketCards(ticketAssets)}

          <p style="margin:22px 0 0;color:#475569;line-height:1.55;">
            Khi den dia diem, dua ma ve hoac QR trong email nay cho nhan vien de kiem tra.
            Ban van co the dang nhap TheWeekend va mo muc <strong>Ve cua toi</strong> de xem lai ve.
          </p>
        </div>
      </div>
    </div>
  `
}

const buildTicketConfirmationText = ({ booking, tickets }) => {
  const placeName = booking.place?.name || 'Dia diem'
  return [
    'Xac nhan dat ve thanh cong',
    `Ma don: ${booking.code}`,
    `Dia diem: ${placeName}`,
    `Ngay di: ${formatDate(booking.visitDate)}`,
    `So luong ve: ${booking.totalQuantity || tickets.length}`,
    `Tong tien: ${formatVnd(booking.totalAmount)}`,
    `Da thanh toan luc: ${formatDateTime(booking.paidAt)}`,
    '',
    'Ma ve:',
    ...tickets.map((ticket, index) => `${index + 1}. ${ticket.code} - ${ticket.name || 'Ve'}`),
    '',
    'Email nay co dinh kem QR cho tung ve. QR chua thong tin chi tiet don ve va nguoi dat.'
  ].join('\n')
}

async function sendTicketConfirmationEmail(bookingId) {
  try {
    const config = getTransportConfig()
    if (!config) {
      console.warn('SMTP not configured - skip ticket confirmation email')
      return false
    }

    const booking = await Booking.findById(bookingId)
      .populate('user', 'username email parentName phone')
      .populate('place', 'name address')
    if (!booking?.user?.email) return false

    const tickets = await Ticket.find({ booking: booking._id }).sort({ lineIndex: 1 })
    if (tickets.length === 0) return false
    const ticketAssets = await createTicketQrAssets({ booking, tickets })

    const transporter = nodemailer.createTransport(config.transport)
    await transporter.sendMail({
      from: config.from,
      to: booking.user.email,
      subject: `Xac nhan ve TheWeekend - ${booking.code}`,
      text: buildTicketConfirmationText({ booking, tickets }),
      html: buildTicketConfirmationHtml({ booking, tickets, ticketAssets }),
      attachments: ticketAssets.map(asset => asset.attachment)
    })
    return true
  } catch (err) {
    console.error('Send ticket confirmation email error:', err)
    return false
  }
}

module.exports = { sendTicketConfirmationEmail }
