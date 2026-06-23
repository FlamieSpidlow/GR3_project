<template>
  <div class="admin-tickets-page">
    <main class="content tw-container-wide">
      <section class="page-head">
        <div>
          <h1>Quan ly ve va thanh toan</h1>
          <p>Doi soat VietQR, theo doi booking, check-in ve dien tu.</p>
        </div>
        <select v-model="statusFilter" @change="loadAll">
          <option value="">Tat ca booking</option>
          <option value="pending">Cho thanh toan</option>
          <option value="paid">Da thanh toan</option>
          <option value="used">Da su dung</option>
          <option value="cancelled">Da huy</option>
          <option value="refunded">Da hoan tien</option>
          <option value="expired">Da het han</option>
        </select>
      </section>

      <section class="admin-grid">
        <form class="tool-card" @submit.prevent="confirmVietQr">
          <h2>Xac nhan VietQR</h2>
          <input v-model.trim="vietQrForm.orderRef" placeholder="Ma thanh toan TWPAY..." required />
          <input v-model.number="vietQrForm.amount" type="number" min="0" step="1000" placeholder="So tien" required />
          <input v-model.trim="vietQrForm.transactionId" placeholder="Ma giao dich ngan hang" />
          <button class="primary-btn" :disabled="submittingVietQr">
            {{ submittingVietQr ? 'Dang xac nhan...' : 'Xac nhan da nhan tien' }}
          </button>
        </form>

        <form class="tool-card" @submit.prevent="checkIn">
          <h2>Check-in ve</h2>
          <input v-model.trim="checkInCode" placeholder="Ma ve hoac payload QR" required />
          <button class="primary-btn" :disabled="checkingIn">
            {{ checkingIn ? 'Dang check-in...' : 'Check-in' }}
          </button>
          <p v-if="checkInMessage" class="tool-message">{{ checkInMessage }}</p>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Danh sach booking</h2>
          <button class="ghost-btn" @click="loadAll">Tai lai</button>
        </div>
        <div v-if="isLoading" class="state-box">Dang tai...</div>
        <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khach hang</th>
                <th>Dia diem</th>
                <th>Ngay di</th>
                <th>Tien</th>
                <th>Thanh toan</th>
                <th>Trang thai</th>
                <th>Ve</th>
                <th>Thao tac</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="orders.length === 0">
                <td colspan="8" class="empty-cell">Khong co booking.</td>
              </tr>
              <tr v-for="order in orders" :key="order._id">
                <td>
                  <strong>{{ order.user?.parentName || order.user?.username || 'Nguoi dung' }}</strong>
                  <span>{{ order.user?.email || '' }}</span>
                </td>
                <td>
                  <strong>{{ order.place?.name || 'Dia diem' }}</strong>
                  <span>{{ order.place?.address || '' }}</span>
                </td>
                <td>{{ formatDate(order.visitDate) }}</td>
                <td>{{ formatVnd(order.totalAmount || order.totalPrice) }}</td>
                <td>
                  <strong>{{ order.payment?.provider || '-' }}</strong>
                  <span>{{ order.payment?.orderRef || '' }}</span>
                </td>
                <td><span :class="['status-badge', order.status]">{{ statusLabel(order.status) }}</span></td>
                <td>
                  <div v-for="ticket in order.tickets || []" :key="ticket._id" class="ticket-code">
                    {{ ticket.code }} - {{ statusLabel(ticket.status) }}
                  </div>
                </td>
                <td class="actions">
                  <button v-if="order.status === 'pending'" class="action-btn cancel" @click="updateStatus(order, 'cancelled')">Huy</button>
                  <button v-if="order.status === 'paid'" class="action-btn refund" @click="updateStatus(order, 'refunded')">Hoan tien</button>
                  <button v-if="['pending','paid'].includes(order.status)" class="action-btn expire" @click="updateStatus(order, 'expired')">Het han</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Doi soat thanh toan</h2>
          <select v-model="paymentProvider" @change="loadPayments">
            <option value="">Tat ca cong thanh toan</option>
            <option value="payos">PayOS</option>
            <option value="vietqr">VietQR</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ma thanh toan</th>
                <th>Provider</th>
                <th>So tien</th>
                <th>Trang thai</th>
                <th>Giao dich</th>
                <th>Ngay tao</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="payments.length === 0">
                <td colspan="6" class="empty-cell">Chua co thanh toan.</td>
              </tr>
              <tr v-for="payment in payments" :key="payment._id">
                <td>{{ payment.orderRef }}</td>
                <td>{{ payment.provider }}</td>
                <td>{{ formatVnd(payment.amount) }}</td>
                <td><span :class="['status-badge', payment.status]">{{ statusLabel(payment.status) }}</span></td>
                <td>{{ payment.providerTransactionId || '-' }}</td>
                <td>
                  {{ formatDateTime(payment.createdAt) }}
                  <button
                    v-if="payment.provider === 'vietqr' && ['pending','pending_review'].includes(payment.status)"
                    type="button"
                    class="reject-payment-btn"
                    @click="rejectVietQr(payment)"
                  >
                    Tu choi
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import {
  checkInTicket,
  confirmVietQrPayment,
  getAdminPayments,
  getAdminTicketOrders,
  rejectVietQrPayment,
  updateTicketOrderStatus
} from '../api/tickets'
import { formatVnd } from '../utils/priceFormatter'
import { getAuthUser } from '../utils/authSession'

export default {
  name: 'AdminTickets',
  data() {
    return {
      orders: [],
      payments: [],
      statusFilter: '',
      paymentProvider: '',
      isLoading: false,
      errorMessage: '',
      submittingVietQr: false,
      checkingIn: false,
      checkInCode: '',
      checkInMessage: '',
      vietQrForm: {
        orderRef: '',
        amount: '',
        transactionId: ''
      }
    }
  },
  mounted() {
    this.checkAdmin()
    this.loadAll()
  },
  methods: {
    checkAdmin() {
      const user = getAuthUser() || {}
      if (!['admin', 'staff'].includes(user.role)) {
        this.$notify({ type: 'error', title: 'Khong co quyen', message: 'Ban can tai khoan admin hoac staff.' })
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
      if (res.success) this.orders = res.data || []
      else this.errorMessage = res.error || 'Khong the tai booking'
      this.isLoading = false
    },
    async loadPayments() {
      const res = await getAdminPayments({ provider: this.paymentProvider })
      if (res.success) this.payments = res.data || []
    },
    async confirmVietQr() {
      this.submittingVietQr = true
      const res = await confirmVietQrPayment({
        orderRef: this.vietQrForm.orderRef,
        amount: Number(this.vietQrForm.amount),
        transactionId: this.vietQrForm.transactionId
      })
      this.submittingVietQr = false
      if (res.success) {
        this.$notify({ type: 'success', title: 'Da xac nhan VietQR', message: 'Booking da duoc chuyen paid va sinh ve.' })
        this.vietQrForm = { orderRef: '', amount: '', transactionId: '' }
        await this.loadAll()
      } else {
        this.$notify({ type: 'error', title: 'Khong the xac nhan', message: res.error || 'VietQR khong hop le' })
      }
    },
    async rejectVietQr(payment) {
      if (!payment?.orderRef) return
      const reason = window.prompt('Ly do tu choi VietQR?', 'Khong tim thay giao dich phu hop')
      if (reason === null) return
      const res = await rejectVietQrPayment({ orderRef: payment.orderRef, reason })
      if (res.success) {
        this.$notify({ type: 'success', title: 'Da tu choi VietQR', message: 'Payment da duoc danh dau that bai.' })
        await this.loadAll()
      } else {
        this.$notify({ type: 'error', title: 'Khong the tu choi', message: res.error || 'Vui long thu lai' })
      }
    },
    async checkIn() {
      this.checkingIn = true
      this.checkInMessage = ''
      const res = await checkInTicket({ ticketCode: this.checkInCode, qrPayload: this.checkInCode })
      this.checkingIn = false
      if (res.success) {
        this.checkInMessage = res.message || 'Check-in thanh cong'
        this.checkInCode = ''
        await this.loadOrders()
      } else {
        this.checkInMessage = res.error || 'Check-in that bai'
      }
    },
    async updateStatus(order, status) {
      const res = await updateTicketOrderStatus(order._id, status)
      if (res.success) await this.loadAll()
      else this.$notify({ type: 'error', title: 'Khong the cap nhat', message: res.error || 'Loi cap nhat trang thai' })
    },
    statusLabel(status) {
      const labels = {
        pending: 'Cho thanh toan',
        pending_review: 'Cho doi soat',
        paid: 'Da thanh toan',
        success: 'Da thanh toan',
        valid: 'Con hieu luc',
        expired: 'Da het han',
        cancelled: 'Da huy',
        refunded: 'Da hoan tien',
        used: 'Da su dung',
        failed: 'That bai'
      }
      return labels[status] || status
    },
    formatDate(value) {
      if (!value) return ''
      return new Date(value).toLocaleDateString('vi-VN')
    },
    formatDateTime(value) {
      if (!value) return ''
      return new Date(value).toLocaleString('vi-VN')
    },
    formatVnd
  }
}
</script>

<style scoped>
.admin-tickets-page {
  min-height: 100%;
  background: var(--tw-bg);
}

.content {
  padding-top: 28px;
  padding-bottom: 48px;
}

.page-head,
.panel-head,
.admin-grid {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-head {
  margin-bottom: 18px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 1.7rem;
  color: var(--tw-text);
}

h2 {
  font-size: 1rem;
  color: var(--tw-text);
}

p {
  color: var(--tw-muted);
}

select,
input {
  border: 1px solid var(--tw-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 18px;
}

.tool-card,
.panel {
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
  box-shadow: var(--tw-shadow-sm);
}

.tool-card {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.panel {
  margin-top: 18px;
  overflow: hidden;
}

.panel-head {
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--tw-border);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid var(--tw-border);
  text-align: left;
  vertical-align: top;
}

th {
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  text-transform: uppercase;
}

td span {
  display: block;
  margin-top: 4px;
  color: var(--tw-muted);
  font-size: 0.82rem;
}

.status-badge {
  display: inline-flex;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-badge.pending { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
.status-badge.pending_review { background: #ffedd5; color: #9a3412; border-color: #fdba74; }
.status-badge.paid,
.status-badge.success,
.status-badge.valid { background: #dcfce7; color: #166534; border-color: #86efac; }
.status-badge.used { background: #ede9fe; color: #5b21b6; border-color: #c4b5fd; }
.status-badge.cancelled,
.status-badge.failed { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.status-badge.refunded { background: #e0f2fe; color: #075985; border-color: #7dd3fc; }
.status-badge.expired { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }

.primary-btn,
.ghost-btn,
.action-btn {
  border: none;
  border-radius: 8px;
  padding: 9px 12px;
  cursor: pointer;
  font-weight: 700;
}

.primary-btn {
  background: var(--tw-primary);
  color: #ffffff;
}

.ghost-btn {
  background: #f1f5f9;
  color: var(--tw-text);
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn.cancel { background: #fee2e2; color: #991b1b; }
.action-btn.refund { background: #e0f2fe; color: #075985; }
.action-btn.expire { background: #f1f5f9; color: #475569; }

.reject-payment-btn {
  display: inline-flex;
  margin-top: 8px;
  border: none;
  border-radius: 7px;
  padding: 6px 9px;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 800;
  cursor: pointer;
}

.state-box,
.empty-cell {
  padding: 20px;
  color: var(--tw-muted);
  text-align: center;
}

.state-box.error {
  color: #b91c1c;
}

.ticket-code {
  font-family: monospace;
  font-size: 0.82rem;
}

.tool-message {
  color: var(--tw-text);
}

@media (max-width: 760px) {
  .admin-grid,
  .page-head {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
