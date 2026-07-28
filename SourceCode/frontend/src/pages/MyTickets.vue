<template>
  <div class="tickets-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Vé của tôi</h1>
          <p>Theo dõi các vé và lượt đi đã phát sinh từ những địa điểm bạn chọn.</p>
        </div>
      </section>

      <section class="page-body tw-container-wide">
        <div v-if="isLoading" class="state-box">Đang tải danh sách vé...</div>
        <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
        <div v-else-if="orders.length === 0" class="state-box empty">
          <h2>Chưa có vé nào</h2>
          <p>Khi bạn đặt vé từ trang chi tiết địa điểm, thông tin sẽ xuất hiện tại đây.</p>
          <router-link to="/places" class="inline-cta">Khám phá địa điểm</router-link>
        </div>

        <div v-else>
          <div class="ticket-filter" role="tablist" aria-label="Lọc vé của tôi">
            <button
              v-for="option in filterOptions"
              :key="option.value"
              type="button"
              :class="['filter-tab', { active: activeFilter === option.value }]"
              @click="activeFilter = option.value"
            >
              {{ option.label }}
              <span>{{ countByFilter(option.value) }}</span>
            </button>
          </div>

          <div v-if="filteredOrders.length === 0" class="state-box">
            Không có vé nào thuộc trạng thái này.
          </div>

          <div v-else class="ticket-list">
            <article v-for="order in filteredOrders" :key="order._id" class="ticket-card">
              <div class="ticket-main">
                <div>
                  <h2>{{ order.place?.name || 'Địa điểm' }}</h2>
                  <p>{{ order.place?.address || 'Địa chỉ chưa cập nhật' }}</p>
                </div>
                <StatusBadge :status="normalizedOrderStatus(order)" />
              </div>

              <div class="ticket-grid">
                <div>
                  <span>Ngày đi</span>
                  <strong>{{ formatDate(order.visitDate) || 'Chưa chọn' }}</strong>
                </div>
                <div>
                  <span>Số lượng</span>
                  <strong>{{ totalQuantity(order) }} vé</strong>
                </div>
                <div>
                  <span>Tổng tiền</span>
                  <strong>{{ formatVnd(order.totalAmount || order.totalPrice) }}</strong>
                </div>
                <div>
                  <span>Mã vé</span>
                  <strong>{{ primaryTicketCode(order) || 'Chờ xác nhận' }}</strong>
                </div>
              </div>

              <p v-if="order.note" class="ticket-note">Ghi chú: {{ order.note }}</p>

              <div class="ticket-actions">
                <button type="button" class="detail-ticket-btn" @click="openTicketDetails(order)">
                  {{ ticketActionLabel(order) }}
                </button>
                <button
                  v-if="canCancel(order)"
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
        </div>
      </section>
    </main>

    <div v-if="detailOrder" class="detail-modal-overlay" @click.self="closeTicketDetails">
      <div class="detail-modal">
        <button type="button" class="modal-close" @click="closeTicketDetails" aria-label="Đóng">×</button>
        <div class="detail-modal-head">
          <h2>Chi tiết vé</h2>
          <StatusBadge :status="normalizedOrderStatus(detailOrder)" />
        </div>

        <div class="detail-summary">
          <div>
            <span>Địa điểm</span>
            <strong>{{ detailOrder.place?.name || 'Địa điểm' }}</strong>
            <p>{{ detailOrder.place?.address || 'Địa chỉ chưa cập nhật' }}</p>
          </div>
          <div>
            <span>Ngày đi</span>
            <strong>{{ formatDate(detailOrder.visitDate) || 'Chưa chọn' }}</strong>
          </div>
          <div>
            <span>Số lượng</span>
            <strong>{{ totalQuantity(detailOrder) }} vé</strong>
          </div>
          <div>
            <span>Tổng tiền</span>
            <strong>{{ formatVnd(detailOrder.totalAmount || detailOrder.totalPrice) }}</strong>
          </div>
          <div>
            <span>Mã đơn</span>
            <strong>{{ bookingCode(detailOrder) }}</strong>
          </div>
          <div>
            <span>Thanh toán</span>
            <strong>{{ paymentLabel(detailOrder.payment) }}</strong>
            <p>{{ statusLabel(normalizedOrderStatus(detailOrder)) }}</p>
          </div>
        </div>

        <div v-if="issuedTickets(detailOrder).length" class="issued-ticket-list">
          <TicketCard
            v-for="ticket in issuedTickets(detailOrder)"
            :key="ticket._id || ticket.code"
            :ticket="ticket"
            :qr-image="ticketQrImages[ticket.code]"
            :visit-date="formatDate(detailOrder.visitDate)"
          />
        </div>
        <div v-else-if="canShowPaymentQr(detailOrder)" class="payment-qr-panel">
          <h3>QR thanh toán</h3>
          <img
            v-if="paymentQrImages[detailOrder._id]"
            :src="paymentQrImages[detailOrder._id]"
            class="payment-qr-image"
            alt="Mã QR thanh toán"
          />
          <p>Quét mã bằng ứng dụng ngân hàng. Sau khi thanh toán được xác nhận, vé sẽ xuất hiện trong mục này.</p>
        </div>
        <div v-else class="detail-empty">
          Vé điện tử sẽ hiển thị sau khi thanh toán được xác nhận.
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode'
import { cancelTicketOrder, getMyTicketOrders, getTicketPaymentStatus } from '../api/tickets'
import StatusBadge from '../components/StatusBadge.vue'
import TicketCard from '../components/TicketCard.vue'
import { getAuthToken } from '../utils/authSession'
import { bookingCode, paymentLabel, statusLabel, ticketCode } from '../utils/displayLabels'
import { loadNotifications, notify, requestConfirmation } from '../utils/notifications'
import { formatVnd } from '../utils/priceFormatter'

export default {
  name: 'MyTickets',
  components: { StatusBadge, TicketCard },
  data() {
    return {
      orders: [],
      isLoading: false,
      ticketQrImages: {},
      paymentQrImages: {},
      detailOrder: null,
      errorMessage: '',
      cancellingOrderId: '',
      checkingPayment: false,
      paymentStatusTimer: null,
      activeFilter: 'all',
      filterOptions: [
        { value: 'all', label: 'Tất cả' },
        { value: 'pending', label: 'Chờ thanh toán' },
        { value: 'paid', label: 'Đã thanh toán' },
        { value: 'used', label: 'Đã sử dụng' },
        { value: 'expired', label: 'Đã hết hạn' },
        { value: 'cancelled', label: 'Đã hủy' }
      ]
    }
  },
  computed: {
    filteredOrders() {
      return this.orders.filter(order => this.matchesFilter(order, this.activeFilter))
    }
  },
  mounted() {
    if (!getAuthToken()) {
      this.$router.push('/login')
      return
    }
    this.loadOrders()
  },
  beforeUnmount() {
    this.stopPaymentStatusWatcher()
  },
  methods: {
    bookingCode,
    paymentLabel,
    statusLabel,
    ticketCode,
    async loadOrders() {
      this.isLoading = true
      this.errorMessage = ''
      const res = await getMyTicketOrders()
      if (res.success) {
        this.orders = res.data || []
        await this.createTicketQrs()
        await this.createPaymentQrs()
      } else {
        this.errorMessage = res.error || 'Không thể tải danh sách vé'
      }
      this.isLoading = false
    },
    async createTicketQrs() {
      const entries = []
      for (const order of this.orders || []) {
        if (!this.canShowIssuedTickets(order)) continue
        for (const ticket of order.tickets || []) {
          if (!ticket.qrPayload) continue
          const image = await QRCode.toDataURL(ticket.qrPayload, {
            width: 160,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
          })
          entries.push([ticket.code, image])
        }
      }
      this.ticketQrImages = Object.fromEntries(entries)
    },
    async createPaymentQrs() {
      const entries = []
      for (const order of this.orders || []) {
        if (!this.canShowPaymentQr(order)) continue
        const source = this.paymentQrSource(order)
        if (!source) continue
        const image = /^data:image\//i.test(source)
          ? source
          : await QRCode.toDataURL(source, {
            width: 180,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
          })
        entries.push([order._id, image])
      }
      this.paymentQrImages = Object.fromEntries(entries)
    },
    normalizedOrderStatus(order) {
      const status = String(order?.status || '')
      if (['success', 'confirmed', 'valid'].includes(status)) return 'paid'
      return status
    },
    matchesFilter(order, filter) {
      const status = String(order?.status || '')
      if (filter === 'all') return true
      if (filter === 'paid') return ['paid', 'success', 'valid', 'confirmed'].includes(status)
      if (filter === 'pending') return ['pending', 'pending_review', 'processing', 'reviewing'].includes(status)
      return status === filter
    },
    countByFilter(filter) {
      return this.orders.filter(order => this.matchesFilter(order, filter)).length
    },
    primaryTicketCode(order) {
      if (!this.canShowIssuedTickets(order)) return ''
      return ticketCode(order?.tickets?.[0]) || order?.ticketCode || ''
    },
    canShowIssuedTickets(order) {
      return ['paid', 'success', 'valid', 'confirmed', 'used'].includes(order?.status)
    },
    canShowTicketCode(order) {
      return this.canShowIssuedTickets(order) && Boolean(order?.ticketCode)
    },
    canShowPaymentQr(order) {
      return this.matchesFilter(order, 'pending') && Boolean(this.paymentQrSource(order))
    },
    ticketActionLabel(order) {
      if (this.canShowPaymentQr(order)) return 'Thanh toán tiếp'
      if (this.canShowIssuedTickets(order) || this.canShowTicketCode(order)) return 'Xem mã QR'
      return 'Chi tiết vé'
    },
    paymentQrSource(order) {
      const payment = order?.payment || {}
      return payment.qrUrl || payment.payUrl || payment.transferContent || payment.orderRef || ''
    },
    issuedTickets(order) {
      return this.canShowIssuedTickets(order) ? (order?.tickets || []) : []
    },
    openTicketDetails(order) {
      this.detailOrder = order
      this.startPaymentStatusWatcher(order)
    },
    closeTicketDetails() {
      this.stopPaymentStatusWatcher()
      this.detailOrder = null
    },
    startPaymentStatusWatcher(order) {
      this.stopPaymentStatusWatcher()
      if (!this.canShowPaymentQr(order)) return
      this.paymentStatusTimer = window.setInterval(() => {
        this.refreshDetailPaymentStatus({ notifyPending: false })
      }, 2500)
    },
    stopPaymentStatusWatcher() {
      if (!this.paymentStatusTimer) return
      window.clearInterval(this.paymentStatusTimer)
      this.paymentStatusTimer = null
    },
    async refreshDetailPaymentStatus({ notifyPending = false } = {}) {
      const orderId = this.detailOrder?._id
      if (!orderId || this.checkingPayment) return false

      this.checkingPayment = true
      const res = await getTicketPaymentStatus(orderId)
      this.checkingPayment = false

      if (!res.success || !res.data) {
        if (notifyPending) {
          notify({
            title: 'Chưa kiểm tra được thanh toán',
            message: res.error || 'Vui lòng thử lại sau ít phút.',
            type: 'warning',
            persist: false
          })
        }
        return false
      }

      const updatedOrder = res.data
      const isPaid = this.canShowIssuedTickets(updatedOrder) || updatedOrder.paymentStatus === 'paid'
      this.orders = this.orders.map(item => item._id === orderId ? updatedOrder : item)
      this.detailOrder = updatedOrder
      await this.createTicketQrs()
      await this.createPaymentQrs()

      if (isPaid) {
        this.stopPaymentStatusWatcher()
        await loadNotifications()
        notify({
          title: 'Thanh toán thành công',
          message: 'Vé điện tử đã sẵn sàng trong mục Vé của tôi.',
          type: 'success',
          persist: false
        })
        return true
      }

      if (notifyPending) {
        notify({
          title: 'Chưa xác nhận thanh toán',
          message: 'Hệ thống chưa nhận được xác nhận thanh toán. Vui lòng chờ thêm một lát.',
          type: 'info',
          persist: false
        })
      }
      return false
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
        await this.createTicketQrs()
        await this.createPaymentQrs()
        await loadNotifications()
        notify({ title: 'Đã hủy vé', message: res.message || 'Đơn vé đã được hủy.', type: 'success', persist: false })
      } else {
        notify({ title: 'Không thể hủy vé', message: res.error || 'Vui lòng thử lại sau.', type: 'error', persist: false })
      }
      this.cancellingOrderId = ''
    },
    totalQuantity(order) {
      return Number(order.totalQuantity) || (Number(order.adultQuantity) || 0) + (Number(order.childQuantity) || 0)
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
.tickets-page { min-height: 100%; background: var(--tw-bg); }
.content { padding: 0; }
.page-hero { position: relative; padding: 28px 0 24px; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.35)); }
.page-hero-inner { position: relative; z-index: 1; color: #ffffff; text-align: center; }
.page-hero h1 { margin: 0 0 8px; font-size: 1.8rem; font-weight: 750; letter-spacing: 0; }
.page-hero p { margin: 0; color: rgba(255, 255, 255, 0.9); font-weight: 550; }
.page-body { padding-top: 26px; padding-bottom: 46px; }
.state-box { background: #ffffff; border: 1px solid var(--tw-border); border-radius: 8px; padding: 24px; color: var(--tw-muted); text-align: center; }
.state-box.error { color: #b91c1c; background: #fef2f2; }
.state-box.empty h2 { margin: 0 0 8px; color: var(--tw-text); font-size: 1.15rem; }
.state-box.empty p { margin: 0 0 16px; }
.inline-cta { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; border-radius: 8px; padding: 9px 14px; background: var(--tw-primary); color: #ffffff; font-weight: 750; text-decoration: none; }
.ticket-filter { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.filter-tab { min-height: 40px; border: 1px solid var(--tw-border); border-radius: 8px; background: #ffffff; color: var(--tw-text); padding: 8px 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.filter-tab span { min-width: 22px; height: 22px; border-radius: 999px; background: #f1f5f9; color: #475569; display: inline-flex; align-items: center; justify-content: center; font-size: 0.78rem; }
.filter-tab.active { border-color: var(--tw-primary); background: var(--tw-primary); color: #ffffff; }
.filter-tab.active span { background: rgba(255, 255, 255, 0.2); color: #ffffff; }
.ticket-list { display: grid; gap: 16px; }
.ticket-card { background: #ffffff; border: 1px solid var(--tw-border); border-radius: 8px; padding: 20px; box-shadow: var(--tw-shadow-sm); }
.ticket-main { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.ticket-main h2 { margin: 0 0 6px; font-size: 1.15rem; color: var(--tw-text); }
.ticket-main p { margin: 0; color: var(--tw-muted); }
.ticket-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.ticket-grid div, .detail-summary div { background: #f8fafc; border: 1px solid var(--tw-border); border-radius: 8px; padding: 12px; min-width: 0; }
.ticket-grid span, .detail-summary span { display: block; color: var(--tw-muted); font-size: 0.82rem; margin-bottom: 5px; }
.ticket-grid strong, .detail-summary strong { color: var(--tw-text); overflow-wrap: anywhere; }
.ticket-note, .detail-summary p, .detail-empty { margin: 0; color: var(--tw-muted); }
.ticket-note { margin-top: 14px; }
.ticket-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.detail-ticket-btn, .cancel-ticket-btn { border-radius: 8px; padding: 9px 13px; color: #ffffff; font-weight: 800; cursor: pointer; }
.detail-ticket-btn { border: 1px solid var(--tw-primary); background: var(--tw-primary); }
.cancel-ticket-btn { border: 1px solid #dc2626; background: #dc2626; }
.cancel-ticket-btn:disabled { cursor: not-allowed; opacity: 0.65; }
.detail-modal-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15, 23, 42, 0.62); }
.detail-modal { position: relative; width: min(760px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; background: #ffffff; border-radius: 8px; padding: 24px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28); }
.modal-close { position: absolute; top: 10px; right: 10px; width: 36px; height: 36px; border: none; border-radius: 999px; background: #f1f5f9; color: var(--tw-text); font-size: 1.5rem; line-height: 1; cursor: pointer; }
.detail-modal-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin: 6px 42px 18px 0; }
.detail-modal-head h2 { margin: 0; color: var(--tw-text); }
.detail-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.issued-ticket-list { display: grid; gap: 12px; }
.detail-empty { border: 1px dashed #94a3b8; border-radius: 8px; padding: 16px; text-align: center; }
.payment-qr-panel {
  display: grid;
  justify-items: center;
  gap: 12px;
  border: 1px solid #fde68a;
  background: #fffbeb;
  border-radius: 8px;
  padding: 18px;
  text-align: center;
}
.payment-qr-panel h3 { margin: 0; color: #92400e; font-size: 1rem; }
.payment-qr-panel p { margin: 0; color: #92400e; line-height: 1.5; }
.payment-qr-image {
  width: 180px;
  height: 180px;
  object-fit: contain;
  background: #ffffff;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 8px;
}
@media (max-width: 780px) {
  .ticket-main { flex-direction: column; }
  .ticket-grid, .detail-summary { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 520px) {
  .ticket-grid, .detail-summary { grid-template-columns: 1fr; }
  .ticket-actions { align-items: stretch; flex-direction: column; }
  .detail-ticket-btn, .cancel-ticket-btn { width: 100%; }
}
</style>
