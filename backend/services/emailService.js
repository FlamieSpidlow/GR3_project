const QRCode = require('qrcode')
const Booking = require('../models/Booking')
const Ticket = require('../models/Ticket')
const { sendEmail } = require('./mailerService')

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

const buildTicketQrPayload = ({ booking, ticket }) => ticket.qrPayload || JSON.stringify({
  type: 'theweekend-ticket',
  ticketCode: ticket.code,
  bookingCode: booking.code
})

const createTicketQrAssets = async ({ booking, tickets }) => {
  const assets = []
  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index]
    const dataUrl = await QRCode.toDataURL(buildTicketQrPayload({ booking, ticket }), {
      width: 360,
      margin: 4,
      errorCorrectionLevel: 'H'
    })
    assets.push({ ticket, index, dataUrl })
  }
  return assets
}

const buildTicketCards = (ticketAssets) => ticketAssets.map(({ ticket, index, dataUrl }) => `
  <div style="display:flex;gap:16px;align-items:center;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:12px;">
    <img src="${dataUrl}" alt="QR ${escapeHtml(ticket.code)}" width="180" height="180" style="width:180px;height:180px;border:1px solid #e5e7eb;border-radius:8px;" />
    <div style="min-width:0;">
      <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Vé ${index + 1}</div>
      <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:6px;">${escapeHtml(ticket.code)}</div>
      <div style="color:#334155;margin-bottom:4px;">Loại vé: ${escapeHtml(ticket.name || 'Vé')}</div>
      <div style="color:#64748b;font-size:13px;">Mã QR này dùng để nhân viên kiểm tra vé.</div>
    </div>
  </div>
`).join('')

const buildTicketConfirmationHtml = ({ booking, tickets, ticketAssets }) => {
  const placeName = booking.place?.name || 'Địa điểm'
  const customerName = booking.user?.parentName || booking.user?.username || 'bạn'
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#0f766e;color:#ffffff;padding:22px 24px;">
          <h1 style="margin:0;font-size:22px;">Xác nhận đặt vé thành công</h1>
          <p style="margin:8px 0 0;">Cảm ơn ${escapeHtml(customerName)} đã đặt vé trên TheWeekend.</p>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 14px;font-size:18px;">Thông tin đơn vé</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
            <tr><td style="padding:8px 0;color:#64748b;">Mã đơn</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(booking.code)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Địa điểm</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(placeName)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Ngày đi</td><td style="padding:8px 0;text-align:right;">${escapeHtml(formatDate(booking.visitDate))}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Số lượng vé</td><td style="padding:8px 0;text-align:right;">${booking.totalQuantity || tickets.length}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Tổng tiền</td><td style="padding:8px 0;font-weight:700;text-align:right;">${escapeHtml(formatVnd(booking.totalAmount))}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;">Đã thanh toán lúc</td><td style="padding:8px 0;text-align:right;">${escapeHtml(formatDateTime(booking.paidAt))}</td></tr>
          </table>

          <h2 style="margin:0 0 12px;font-size:18px;">Mã vé điện tử</h2>
          ${buildTicketCards(ticketAssets)}

          <p style="margin:22px 0 0;color:#475569;line-height:1.55;">
            Khi đến địa điểm, vui lòng xuất trình mã QR này để nhân viên kiểm tra vé.
            Bạn vẫn có thể đăng nhập TheWeekend và mở mục <strong>Vé của tôi</strong> để xem lại vé.
          </p>
        </div>
      </div>
    </div>
  `
}

const buildTicketConfirmationText = ({ booking, tickets }) => {
  const placeName = booking.place?.name || 'Địa điểm'
  return [
    'Xác nhận đặt vé thành công',
    `Mã đơn: ${booking.code}`,
    `Địa điểm: ${placeName}`,
    `Ngày đi: ${formatDate(booking.visitDate)}`,
    `Số lượng vé: ${booking.totalQuantity || tickets.length}`,
    `Tổng tiền: ${formatVnd(booking.totalAmount)}`,
    `Đã thanh toán lúc: ${formatDateTime(booking.paidAt)}`,
    '',
    'Mã vé:',
    ...tickets.map((ticket, index) => `${index + 1}. ${ticket.code} - ${ticket.name || 'Vé'}`),
    '',
    'Email này có đính kèm QR cho từng vé. Khi đến địa điểm, vui lòng xuất trình mã QR này để nhân viên kiểm tra vé.'
  ].join('\n')
}

async function sendTicketConfirmationEmail(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('user', 'username email parentName phone')
      .populate('place', 'name address')
    if (!booking?.user?.email) return false

    const tickets = await Ticket.find({ booking: booking._id }).sort({ lineIndex: 1 })
    if (tickets.length === 0) return false
    const ticketAssets = await createTicketQrAssets({ booking, tickets })

    return await sendEmail({
      to: booking.user.email,
      subject: `Xác nhận vé TheWeekend - ${booking.code}`,
      text: buildTicketConfirmationText({ booking, tickets }),
      html: buildTicketConfirmationHtml({ booking, tickets, ticketAssets })
    })
  } catch (err) {
    console.error('Send ticket confirmation email error:', err)
    return false
  }
}

module.exports = { sendTicketConfirmationEmail }
