<template>
  <div class="tickets-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Vé của tôi</h1>
          <p>Theo dõi yêu cầu đặt vé và mã vé đã được xác nhận</p>
        </div>
      </section>

      <section class="page-body tw-container-wide">
        <div v-if="isLoading" class="state-box">Đang tải danh sách vé...</div>
        <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
        <div v-else-if="orders.length === 0" class="state-box">
          Bạn chưa có yêu cầu đặt vé nào.
          <router-link to="/" class="inline-link">Khám phá địa điểm</router-link>
        </div>

        <div v-else class="ticket-list">
          <article v-for="order in orders" :key="order._id" class="ticket-card">
            <div class="ticket-main">
              <div>
                <h2>{{ order.place?.name || 'Địa điểm' }}</h2>
                <p>{{ order.place?.address || 'Địa chỉ chưa cập nhật' }}</p>
              </div>
              <span :class="['status-badge', order.status]">{{ statusLabel(order.status) }}</span>
            </div>

            <div class="ticket-grid">
              <div>
                <span>Ngày đi</span>
                <strong>{{ formatDate(order.visitDate) }}</strong>
              </div>
              <div>
                <span>Số lượng</span>
                <strong>{{ totalQuantity(order) }} vé</strong>
              </div>
              <div>
                <span>Tổng tiền</span>
                <strong>{{ formatVnd(order.totalPrice) }}</strong>
              </div>
              <div>
                <span>Mã vé</span>
                <strong>{{ primaryTicketCode(order) || 'Chờ xác nhận' }}</strong>
              </div>
            </div>

            <div v-if="order.status === 'pending'" class="ticket-code-box payment-box">
              <button
                v-if="paymentQrImages[order._id]"
                type="button"
                class="qr-preview-btn"
                @click="openQrPreview(order)"
              >
                <img :src="paymentQrImages[order._id]" class="mini-payment-qr" alt="Mã QR thanh toán" />
              </button>
              <div>
                <p>Quét QR để thanh toán đơn vé.</p>
              </div>
            </div>

            <div v-else-if="order.ticketCode" class="ticket-code-box">
              <div class="qr-like">{{ order.ticketCode }}</div>
              <p>Xuất trình mã này khi đến địa điểm.</p>
            </div>

            <p v-if="order.note" class="ticket-note">Ghi chú: {{ order.note }}</p>

            <div v-if="canCancel(order)" class="ticket-actions">
              <button
                type="button"
                class="cancel-ticket-btn"
                :disabled="cancellingOrderId === order._id"
                @click="cancelOrder(order)"
              >
                {{ cancellingOrderId === order._id ? 'Đang hủy...' : 'Hủy vé' }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="previewOrder" class="qr-modal-overlay" @click.self="closeQrPreview">
      <div class="qr-modal">
        <button type="button" class="qr-modal-close" @click="closeQrPreview" aria-label="Đóng">×</button>
        <h2>Quét QR thanh toán</h2>
        <p>{{ previewOrder.place?.name || 'Đơn vé' }}</p>
        <img :src="paymentQrImages[previewOrder._id]" class="qr-large" alt="Mã QR thanh toán" />
      </div>
    </div>
  </div>
</template>

<script>
import { cancelTicketOrder, getMyTicketOrders } from '../api/tickets'
import QRCode from 'qrcode'
import { formatVnd } from '../utils/priceFormatter'
import { getAuthToken } from '../utils/authSession'
import { loadNotifications, notify, requestConfirmation } from '../utils/notifications'

export default {
  name: 'MyTickets',
  data() {
    return {
      orders: [],
      isLoading: false,
      paymentQrImages: {},
      ticketQrImages: {},
      previewOrder: null,
      errorMessage: '',
      cancellingOrderId: ''
    }
  },
  mounted() {
    if (!getAuthToken()) {
      this.$router.push('/login')
      return
    }
    this.loadOrders()
  },
  methods: {
    async loadOrders() {
      this.isLoading = true
      this.errorMessage = ''
      const res = await getMyTicketOrders()
      if (res.success) {
        this.orders = res.data || []
        await this.createPaymentQrs()
      } else {
        this.errorMessage = res.error || 'Không thể tải danh sách vé'
      }
      this.isLoading = false
    },
    statusLabel(status) {
      const labels = {
        pending: 'Cho thanh toan',
        paid: 'Da thanh toan',
        expired: 'Da het han',
        cancelled: 'Da huy',
        refunded: 'Da hoan tien',
        used: 'Da su dung'
      }
      return labels[status] || status
    },
    async createPaymentQrs() {
      const paymentEntries = []
      const ticketEntries = []
      for (const order of this.orders || []) {
        if (order.status === 'pending' && order.payment?.qrUrl) {
          paymentEntries.push([order._id, order.payment.qrUrl])
        }
        for (const ticket of order.tickets || []) {
          if (ticket.qrPayload) {
            const image = await QRCode.toDataURL(ticket.qrPayload, {
              width: 160,
              margin: 2,
              color: { dark: '#0f172a', light: '#ffffff' }
            })
            ticketEntries.push([ticket.code, image])
          }
        }
      }
      this.paymentQrImages = Object.fromEntries(paymentEntries)
      this.ticketQrImages = Object.fromEntries(ticketEntries)
    },
    primaryTicketCode(order) {
      return order?.tickets?.[0]?.code || order?.ticketCode || ''
    },
    openQrPreview(order) {
      this.previewOrder = order
    },
    closeQrPreview() {
      this.previewOrder = null
    },
    canCancel(order) {
      return ['pending'].includes(order?.status)
    },
    async cancelOrder(order) {
      if (!order || !this.canCancel(order)) return
      const ok = await requestConfirmation({
        title: 'Hủy vé',
        message: `Bạn có chắc muốn hủy vé tại ${order.place?.name || 'địa điểm này'} không?`,
        confirmText: 'Hủy vé',
        cancelText: 'Giữ vé',
        tone: 'danger'
      })
      if (!ok) return

      this.cancellingOrderId = order._id
      const res = await cancelTicketOrder(order._id)
      if (res.success) {
        const updated = res.data
        this.orders = this.orders.map(item => item._id === updated._id ? updated : item)
        await this.createPaymentQrs()
        await loadNotifications()
        notify({ title: 'Đã hủy vé', message: res.message || 'Đơn vé đã được hủy.', type: 'success', persist: false })
      } else {
        notify({ title: 'Không thể hủy vé', message: res.error || 'Vui lòng thử lại sau.', type: 'error', persist: false })
      }
      this.cancellingOrderId = ''
    },
    totalQuantity(order) {
      return (Number(order.adultQuantity) || 0) + (Number(order.childQuantity) || 0)
    },
    formatDate(value) {
      if (!value) return ''
      return new Date(value).toLocaleDateString('vi-VN')
    },
    formatVnd
  }
}
</script>

<style scoped>
.tickets-page {
  min-height: 100%;
  background: var(--tw-bg);
}

.content { padding: 0; }

.page-hero {
  position: relative;
  padding: 34px 0 26px;
  overflow: hidden;
}

.page-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('~@/../public/Playground.jpg');
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.page-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.35));
}

.page-hero-inner {
  position: relative;
  z-index: 1;
  color: #ffffff;
  text-align: center;
}

.page-hero h1 {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 900;
}

.page-hero p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.page-body {
  padding-top: 26px;
  padding-bottom: 46px;
}

.state-box {
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
  padding: 24px;
  color: var(--tw-muted);
  text-align: center;
}

.state-box.error {
  color: #b91c1c;
  background: #fef2f2;
}

.inline-link {
  display: inline-block;
  margin-left: 8px;
  color: var(--tw-primary);
  font-weight: 800;
}

.ticket-list {
  display: grid;
  gap: 16px;
}

.ticket-card {
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--tw-shadow-sm);
}

.ticket-main {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.ticket-main h2 {
  margin: 0 0 6px;
  font-size: 1.15rem;
  color: var(--tw-text);
}

.ticket-main p {
  margin: 0;
  color: var(--tw-muted);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  min-width: 132px;
  min-height: 34px;
  border-radius: 999px;
  padding: 7px 14px;
  font-weight: 800;
  font-size: 0.82rem;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  text-align: center;
}

.status-badge.unpaid { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
.status-badge.pending { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
.status-badge.confirmed { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
.status-badge.paid { background: #dcfce7; color: #166534; border-color: #86efac; }
.status-badge.expired { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
.status-badge.refunded { background: #e0f2fe; color: #075985; border-color: #7dd3fc; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.status-badge.used { background: #f3e8ff; color: #6b21a8; border-color: #c084fc; }

.ticket-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.ticket-grid div {
  background: #f8fafc;
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 12px;
}

.ticket-grid span {
  display: block;
  color: var(--tw-muted);
  font-size: 0.82rem;
  margin-bottom: 5px;
}

.ticket-grid strong {
  color: var(--tw-text);
}

.ticket-code-box {
  margin-top: 16px;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.qr-like {
  font-family: monospace;
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--tw-text);
}

.payment-box {
  justify-content: flex-start;
}

.issued-ticket {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.issued-ticket + .issued-ticket {
  border-top: 1px solid var(--tw-border);
  padding-top: 12px;
}

.qr-preview-btn {
  border: none;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
}

.mini-payment-qr {
  width: 112px;
  height: 112px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 8px;
}

.pay-btn {
  margin-top: 10px;
  border: none;
  border-radius: 8px;
  padding: 9px 12px;
  background: var(--tw-primary);
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
}

.pay-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.pay-btn.wide {
  width: 100%;
}

.qr-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.62);
}

.qr-modal {
  position: relative;
  width: min(380px, 100%);
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

.qr-modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: #f1f5f9;
  color: var(--tw-text);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.qr-modal h2 {
  margin: 8px 0 6px;
  color: var(--tw-text);
}

.qr-modal p {
  margin: 0 0 16px;
  color: var(--tw-muted);
}

.qr-large {
  width: min(280px, 100%);
  aspect-ratio: 1;
  padding: 12px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
}

.ticket-code-box p,
.ticket-note {
  margin: 0;
  color: var(--tw-muted);
}

.ticket-note {
  margin-top: 14px;
}

.ticket-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.cancel-ticket-btn {
  border: 1px solid #dc2626;
  border-radius: 8px;
  padding: 9px 13px;
  background: #dc2626;
  color: #ffffff;
  font-weight: 900;
  cursor: pointer;
}

.cancel-ticket-btn:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.cancel-ticket-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 780px) {
  .ticket-main,
  .ticket-code-box {
    flex-direction: column;
  }

  .ticket-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .ticket-grid {
    grid-template-columns: 1fr;
  }
}
</style>
