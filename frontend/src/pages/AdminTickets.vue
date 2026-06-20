<template>
  <div class="admin-tickets-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Quản lý vé</h1>
          <p>Xác nhận, hủy và đánh dấu vé đã sử dụng</p>
        </div>
      </section>

      <section class="page-body tw-container-wide">
        <div class="toolbar">
          <h2>Danh sách đơn vé</h2>
          <select v-model="statusFilter" @change="loadOrders">
            <option value="unpaid">Chờ thanh toán</option>
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="cancelled">Đã hủy</option>
            <option value="used">Đã sử dụng</option>
          </select>
        </div>

        <div v-if="isLoading" class="state-box">Đang tải...</div>
        <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>
        <div v-else class="table-wrap">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Địa điểm</th>
                <th>Ngày đi</th>
                <th>Số lượng</th>
                <th>Tổng tiền</th>
                <th>Mã vé</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="orders.length === 0">
                <td colspan="8" class="empty-cell">Không có đơn vé nào.</td>
              </tr>
              <tr v-for="order in orders" :key="order._id">
                <td>
                  <strong>{{ order.user?.parentName || order.user?.username || 'Người dùng' }}</strong>
                  <span>{{ order.user?.email || '' }}</span>
                </td>
                <td>
                  <strong>{{ order.place?.name || 'Địa điểm' }}</strong>
                  <span>{{ order.place?.address || '' }}</span>
                </td>
                <td>{{ formatDate(order.visitDate) }}</td>
                <td>{{ totalQuantity(order) }} vé</td>
                <td>{{ formatVnd(order.totalPrice) }}</td>
                <td class="ticket-code">{{ order.ticketCode || '-' }}</td>
                <td><span :class="['status-badge', order.status]">{{ statusLabel(order.status) }}</span></td>
                <td class="actions">
                  <button v-if="order.status === 'unpaid'" @click="updateStatus(order, 'cancelled')" class="action-btn cancel">Hủy</button>
                  <button v-if="order.status === 'pending'" @click="updateStatus(order, 'confirmed')" class="action-btn confirm">Xác nhận</button>
                  <button v-if="order.status === 'pending' || order.status === 'confirmed'" @click="updateStatus(order, 'cancelled')" class="action-btn cancel">Hủy</button>
                  <button v-if="order.status === 'confirmed'" @click="updateStatus(order, 'used')" class="action-btn used">Đã sử dụng</button>
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
import { getAdminTicketOrders, updateTicketOrderStatus } from '../api/tickets'
import { formatVnd } from '../utils/priceFormatter'
import { getAuthUser } from '../utils/authSession'

export default {
  name: 'AdminTickets',
  data() {
    return {
      orders: [],
      statusFilter: '',
      isLoading: false,
      errorMessage: ''
    }
  },
  mounted() {
    this.checkAdmin()
    this.loadOrders()
  },
  methods: {
    checkAdmin() {
      const user = getAuthUser() || {}
      if (user.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang này')
        this.$router.push('/')
      }
    },
    async loadOrders() {
      this.isLoading = true
      this.errorMessage = ''
      const res = await getAdminTicketOrders(this.statusFilter)
      if (res.success) {
        this.orders = res.data || []
      } else {
        this.errorMessage = res.error || 'Không thể tải danh sách đơn vé'
      }
      this.isLoading = false
    },
    async updateStatus(order, status) {
      const label = this.statusLabel(status).toLowerCase()
      if (!confirm(`Cập nhật đơn vé này thành "${label}"?`)) return

      const res = await updateTicketOrderStatus(order._id, status)
      if (res.success) {
        await this.loadOrders()
      } else {
        alert(res.error || 'Không thể cập nhật trạng thái vé')
      }
    },
    statusLabel(status) {
      const labels = {
        unpaid: 'Chờ thanh toán',
        pending: 'Chờ xác nhận',
        confirmed: 'Đã xác nhận',
        cancelled: 'Đã hủy',
        used: 'Đã sử dụng'
      }
      return labels[status] || status
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
.admin-tickets-page {
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.toolbar h2 {
  margin: 0;
  color: var(--tw-text);
}

.toolbar select {
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
}

.state-box,
.table-wrap {
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
  box-shadow: var(--tw-shadow-sm);
}

.state-box {
  padding: 24px;
  text-align: center;
  color: var(--tw-muted);
}

.state-box.error {
  color: #b91c1c;
  background: #fef2f2;
}

.table-wrap {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
}

.orders-table th,
.orders-table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--tw-border);
  text-align: left;
  vertical-align: top;
}

.orders-table th {
  background: #f8fafc;
  color: var(--tw-text);
  font-size: 0.86rem;
}

.orders-table td span {
  display: block;
  color: var(--tw-muted);
  font-size: 0.82rem;
  margin-top: 4px;
}

.empty-cell {
  text-align: center;
  color: var(--tw-muted);
}

.ticket-code {
  font-family: monospace;
  font-weight: 800;
}

.status-badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 7px 10px;
  font-weight: 800;
  font-size: 0.8rem;
  white-space: nowrap;
}

.status-badge.unpaid { background: #fee2e2; color: #991b1b; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.confirmed { background: #dcfce7; color: #166534; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.status-badge.used { background: #e0e7ff; color: #3730a3; }

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
}

.action-btn.confirm { background: #059669; }
.action-btn.cancel { background: #dc2626; }
.action-btn.used { background: #4f46e5; }

@media (max-width: 720px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
