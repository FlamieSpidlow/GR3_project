<template>
  <div class="admin-tickets-page">
    <main class="content tw-container-wide">
      <AdminPageHeader
        title="Quản lý đặt vé và thanh toán"
        description="Theo dõi đơn đặt vé, đối soát thanh toán và vé điện tử đã phát hành."
      >
        <template #actions>
          <div class="header-filters">
            <select v-model="statusFilter" @change="loadOrders">
              <option value="">Tất cả đơn đặt vé</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="expired">Đã hết hạn</option>
              <option value="cancelled">Đã hủy</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>
            <ActionButton :icon="ArrowPathIcon" tone="muted" title="Làm mới" @click="loadAll">Làm mới</ActionButton>
          </div>
        </template>
      </AdminPageHeader>

      <section class="panel">
        <div class="panel-head">
          <h2>Danh sách đơn đặt vé</h2>
        </div>

        <div v-if="isLoading" class="state-box">Đang tải đơn đặt vé...</div>
        <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
        <EmptyState
          v-else-if="orders.length === 0"
          title="Chưa có đơn đặt vé"
          message="Không có đơn đặt vé phù hợp với bộ lọc hiện tại."
        />

        <DataTable v-else>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Địa điểm</th>
              <th>Ngày đi</th>
              <th>Tổng tiền</th>
              <th>Mã thanh toán</th>
              <th>Trạng thái</th>
              <th>Vé</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order._id">
              <td><strong class="code-text">{{ bookingCode(order) }}</strong></td>
              <td>
                <strong>{{ displayUser(order) }}</strong>
                <span>{{ order.user?.email || 'Chưa cập nhật' }}</span>
              </td>
              <td class="place-cell">
                <strong>{{ order.place?.name || 'Địa điểm' }}</strong>
                <span>{{ order.place?.address || 'Chưa cập nhật địa chỉ' }}</span>
              </td>
              <td>{{ formatDate(order.visitDate) }}</td>
              <td>{{ formatVnd(order.totalAmount || order.totalPrice) }}</td>
              <td>
                <span class="muted-code">{{ paymentLabel(order.payment) }}</span>
              </td>
              <td><StatusBadge :status="order.status" /></td>
              <td>
                <div class="ticket-cell">
                  <strong>{{ ticketCount(order) }}</strong>
                  <StatusBadge v-if="primaryTicket(order)" :status="primaryTicket(order).status" />
                  <ActionButton
                    v-if="(order.tickets || []).length"
                    tone="muted"
                    @click="openTickets(order)"
                  >
                    Xem vé
                  </ActionButton>
                </div>
              </td>
            </tr>
          </tbody>
        </DataTable>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Đối soát thanh toán</h2>
          <div class="header-filters">
            <select v-model="paymentStatus" @change="loadPayments">
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="pending_review">Chờ đối soát</option>
              <option value="success">Đã thanh toán</option>
              <option value="cancelled">Đã hủy</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>
          </div>
        </div>

        <EmptyState
          v-if="payments.length === 0"
          title="Chưa có thanh toán"
          message="Không có giao dịch phù hợp với bộ lọc hiện tại."
        />
        <DataTable v-else>
          <thead>
            <tr>
              <th>Mã thanh toán</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Mã giao dịch</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment._id">
              <td><strong class="code-text">{{ paymentCode(payment) }}</strong></td>
              <td>{{ formatVnd(payment.amount) }}</td>
              <td><StatusBadge :status="payment.status" /></td>
              <td>{{ payment.providerTransactionId || 'Chưa có' }}</td>
              <td>{{ formatDateTime(payment.createdAt) }}</td>
            </tr>
          </tbody>
        </DataTable>
      </section>

      <TicketListModal
        v-if="ticketModalOrder"
        :booking="ticketModalOrder"
        :qr-images="ticketQrImages"
        @close="ticketModalOrder = null"
      />
    </main>
  </div>
</template>

<script>
import QRCode from 'qrcode'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import ActionButton from '../components/ActionButton.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import DataTable from '../components/DataTable.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import TicketListModal from '../components/TicketListModal.vue'
import { getAdminPayments, getAdminTicketOrders } from '../api/tickets'
import { bookingCode, paymentCode, paymentLabel } from '../utils/displayLabels'
import { formatVnd } from '../utils/priceFormatter'
import { getAuthUser } from '../utils/authSession'

export default {
  name: 'AdminTickets',
  components: { ActionButton, AdminPageHeader, DataTable, EmptyState, StatusBadge, TicketListModal },
  data() {
    return {
      ArrowPathIcon,
      orders: [],
      payments: [],
      ticketQrImages: {},
      ticketModalOrder: null,
      statusFilter: '',
      paymentStatus: '',
      paymentProvider: 'payos',
      isLoading: false,
      errorMessage: ''
    }
  },
  mounted() {
    this.checkAdmin()
    this.loadAll()
  },
  methods: {
    bookingCode,
    formatVnd,
    paymentCode,
    paymentLabel,
    checkAdmin() {
      const user = getAuthUser() || {}
      if (!['admin', 'staff'].includes(user.role)) {
        this.$notify({ type: 'error', title: 'Không có quyền', message: 'Bạn cần tài khoản quản trị hoặc nhân viên.' })
        this.$router.push('/')
      }
    },
    async loadAll() {
      await Promise.all([this.loadOrders(), this.loadPayments()])
    },
    async loadOrders() {
      this.isLoading = true
      this.errorMessage = ''
      const res = await getAdminTicketOrders(this.statusFilter)
      if (res.success) {
        this.orders = res.data || []
        await this.createTicketQrs()
      } else {
        this.errorMessage = res.error || 'Không thể tải đơn đặt vé'
      }
      this.isLoading = false
    },
    async loadPayments() {
      const res = await getAdminPayments({ status: this.paymentStatus, provider: this.paymentProvider })
      if (res.success) this.payments = res.data || []
    },
    async createTicketQrs() {
      const entries = []
      for (const order of this.orders || []) {
        if (!['paid', 'success', 'valid', 'confirmed', 'used'].includes(order.status)) continue
        for (const ticket of order.tickets || []) {
          if (!ticket.qrPayload || !ticket.code) continue
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
    displayUser(order) {
      return order.user?.parentName || order.user?.username || 'Người dùng'
    },
    ticketCount(order) {
      const count = (order.tickets || []).length
      return count ? `${count} vé` : 'Chưa có'
    },
    primaryTicket(order) {
      return (order.tickets || [])[0] || null
    },
    openTickets(order) {
      this.ticketModalOrder = order
    },
    formatDate(value) {
      return value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật'
    },
    formatDateTime(value) {
      return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa cập nhật'
    }
  }
}
</script>

<style scoped>
.admin-tickets-page { min-height: 100%; background: var(--tw-bg); }
.content { padding-top: 28px; padding-bottom: 48px; }
.panel { margin-top: 18px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
h2 { margin: 0; color: var(--tw-text); font-size: 1.05rem; }
select { min-height: 40px; border: 1px solid var(--tw-border); border-radius: 8px; padding: 8px 12px; background: #fff; }
.header-filters { display: flex; align-items: center; gap: 10px; }
.code-text,
.muted-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere; }
td span:not(.status-badge) { display: block; margin-top: 4px; color: var(--tw-muted); font-size: 0.82rem; }
.place-cell span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 260px; }
.ticket-cell { display: grid; gap: 8px; min-width: 116px; }
.state-box { padding: 20px; color: var(--tw-muted); text-align: center; }
.state-box.error { color: #b91c1c; }
@media (max-width: 760px) {
  .panel-head,
  .header-filters { align-items: stretch; flex-direction: column; }
}
</style>
