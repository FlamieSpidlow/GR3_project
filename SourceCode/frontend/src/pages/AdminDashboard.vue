<template>
  <div class="admin-dashboard">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Quản trị hệ thống</h1>
          <p>Điều hành đơn đặt vé, thanh toán, vé điện tử và nội dung của TheWeekend.</p>
        </div>
      </section>

      <div class="tw-container-wide page-body">
        <AdminPageHeader
          title="Tổng quan vận hành"
          :description="`Xin chào, ${username}. Các chỉ số dưới đây giúp theo dõi nhanh tình trạng hệ thống.`"
        />

        <div class="stat-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-card tw-surface">
            <component :is="stat.icon" class="stat-icon" aria-hidden="true" />
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
          </div>
        </div>

        <div class="ops-grid">
          <section class="ops-panel tw-surface">
            <div class="ops-head">
              <h2>Đơn đặt vé gần đây</h2>
              <router-link to="/admin/tickets">Xem tất cả →</router-link>
            </div>
            <div v-if="recentBookings.length === 0" class="empty-line">Chưa có đơn đặt vé.</div>
            <div v-else class="ops-list">
              <div v-for="booking in recentBookings" :key="booking._id" class="ops-row">
                <div>
                  <strong>{{ booking.place?.name || 'Địa điểm' }}</strong>
                  <span>{{ booking.user?.parentName || booking.user?.username || 'Người dùng' }}</span>
                </div>
                <StatusBadge :status="booking.status" />
              </div>
            </div>
          </section>

          <section class="ops-panel tw-surface">
            <div class="ops-head">
              <h2>Giao dịch cần đối soát</h2>
              <router-link to="/admin/tickets">Đối soát</router-link>
            </div>
            <div v-if="actionablePayments.length === 0" class="empty-line">Không có giao dịch cần đối soát.</div>
            <div v-else class="ops-list">
              <div v-for="payment in actionablePayments" :key="payment._id" class="ops-row">
                <div>
                  <strong>{{ formatMoney(payment.amount) }}</strong>
                  <span>{{ payment.orderRef || 'Chưa có mã thanh toán' }}</span>
                </div>
                <StatusBadge :status="payment.status" />
              </div>
            </div>
          </section>
        </div>

        <div class="admin-cards">
          <router-link to="/admin/users" class="admin-card tw-surface">
            <UsersIcon class="card-icon" aria-hidden="true" />
            <h2>Quản lý người dùng</h2>
            <p>Tìm kiếm, phân quyền và cập nhật thông tin người dùng.</p>
          </router-link>

          <router-link to="/admin/places" class="admin-card tw-surface">
            <MapPinIcon class="card-icon" aria-hidden="true" />
            <h2>Quản lý địa điểm</h2>
            <p>Chuẩn hóa ảnh, giá, độ tuổi và nội dung hiển thị.</p>
          </router-link>

          <router-link to="/admin/tickets" class="admin-card tw-surface">
            <TicketIcon class="card-icon" aria-hidden="true" />
            <h2>Quản lý đặt vé</h2>
            <p>Theo dõi thanh toán, trạng thái đơn đặt vé và vé điện tử.</p>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { BanknotesIcon, MapPinIcon, TicketIcon, UsersIcon } from '@heroicons/vue/24/outline'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { getAllPlaces, getAllUsers } from '../api/admin'
import { getAdminPayments, getAdminTicketOrders } from '../api/tickets'
import { getAuthUser } from '../utils/authSession'

export default {
  name: 'AdminDashboard',
  components: { AdminPageHeader, BanknotesIcon, MapPinIcon, StatusBadge, TicketIcon, UsersIcon },
  data() {
    return {
      username: 'Admin',
      users: [],
      places: [],
      bookings: [],
      payments: []
    }
  },
  computed: {
    todayKey() {
      return new Date().toISOString().slice(0, 10)
    },
    bookingsToday() {
      return this.bookings.filter(item => String(item.createdAt || '').slice(0, 10) === this.todayKey).length
    },
    revenueToday() {
      return this.payments
        .filter(item => ['success', 'paid'].includes(item.status) && String(item.paidAt || item.updatedAt || item.createdAt || '').slice(0, 10) === this.todayKey)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    },
    revenueTodayLabel() {
      return `${Math.round(Number(this.revenueToday) || 0).toLocaleString('vi-VN')}đ`
    },
    pendingTickets() {
      return this.bookings.filter(item => ['pending', 'pending_review'].includes(item.status)).length
    },
    recentBookings() {
      return [...this.bookings].slice(0, 5)
    },
    actionablePayments() {
      return this.payments.filter(item => ['pending', 'pending_review', 'processing', 'reviewing'].includes(item.status)).slice(0, 5)
    },
    stats() {
      return [
        { label: 'Tổng người dùng', value: this.users.length, icon: 'UsersIcon' },
        { label: 'Tổng địa điểm', value: this.places.length, icon: 'MapPinIcon' },
        { label: 'Đơn đặt vé hôm nay', value: this.bookingsToday, icon: 'TicketIcon' },
        { label: 'Doanh thu hôm nay', value: this.revenueTodayLabel, icon: 'BanknotesIcon' },
        { label: 'Vé chờ xử lý', value: this.pendingTickets, icon: 'TicketIcon' }
      ]
    }
  },
  mounted() {
    const user = getAuthUser() || {}
    if (user.role !== 'admin') {
      this.$notify({ type: 'error', title: 'Không có quyền truy cập', message: 'Bạn cần tài khoản quản trị để mở trang này.' })
      this.$router.push('/')
      return
    }
    this.username = user.username || user.parentName || 'Admin'
    this.loadStats()
  },
  methods: {
    formatMoney(value) {
      return `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`
    },
    async loadStats() {
      const [usersRes, placesRes, bookingsRes, paymentsRes] = await Promise.all([
        getAllUsers(),
        getAllPlaces(),
        getAdminTicketOrders(''),
        getAdminPayments({})
      ])
      if (usersRes.success) this.users = usersRes.data || []
      if (placesRes.success) this.places = placesRes.data || []
      if (bookingsRes.success) this.bookings = bookingsRes.data || []
      if (paymentsRes.success) this.payments = paymentsRes.data || []
    }
  }
}
</script>

<style scoped>
.admin-dashboard { background: var(--tw-bg); min-height: 100%; }
.content { padding: 0; }
.page-hero { position: relative; padding: 28px 0 22px; min-height: 132px; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.42)); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px; font-size: 1.9rem; font-weight: 900; letter-spacing: 0; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.9); font-weight: 650; line-height: 1.5; }
.page-body { padding: 24px 0 46px; }
.stat-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.stat-card { display: grid; gap: 8px; padding: 16px; }
.stat-icon { width: 24px; height: 24px; color: #527392; }
.stat-card span { color: #64748b; font-size: .84rem; font-weight: 780; }
.stat-card strong { color: #0f172a; font-size: 1.2rem; line-height: 1.2; }
.ops-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:18px; margin-bottom:18px; }
.ops-panel { padding:18px; }
.ops-head { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:12px; }
.ops-head h2 { margin:0; color:#0f172a; font-size:1.02rem; }
.ops-head a { color:#527392; font-weight:850; text-decoration:none; }
.ops-list { display:grid; gap:10px; }
.ops-row { display:flex; align-items:center; justify-content:space-between; gap:14px; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; background:#f8fafc; }
.ops-row strong { display:block; color:#0f172a; }
.ops-row span { display:block; margin-top:3px; color:#64748b; font-size:.84rem; }
.empty-line { border:1px dashed #cbd5e1; border-radius:10px; padding:16px; color:#64748b; text-align:center; }
.admin-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.admin-card { padding: 22px; text-decoration: none; color: inherit; transition: transform .18s ease, box-shadow .18s ease; }
.admin-card:hover { transform: translateY(-2px); box-shadow: var(--tw-shadow-md); }
.card-icon { width: 32px; height: 32px; color: #527392; margin-bottom: 14px; }
.admin-card h2 { margin: 0 0 8px; font-size: 1.1rem; font-weight: 850; color: #111827; }
.admin-card p { margin: 0; color: #64748b; font-size: .92rem; line-height: 1.5; }
@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ops-grid,
  .admin-cards { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .stat-grid { grid-template-columns: 1fr; }
}
</style>
