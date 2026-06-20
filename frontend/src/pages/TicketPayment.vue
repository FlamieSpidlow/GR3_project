<template>
  <main class="payment-page">
    <section class="payment-card">
      <div :class="['payment-icon', status]">
        <span v-if="status === 'success'">✓</span>
        <span v-else-if="status === 'error'">!</span>
        <span v-else>...</span>
      </div>

      <h1>{{ title }}</h1>
      <p>{{ message }}</p>

      <router-link v-if="status === 'success'" to="/" class="payment-link">
        Quay lại trang chủ
      </router-link>
      <router-link v-else-if="status === 'error'" to="/" class="payment-link secondary">
        Về trang chủ
      </router-link>
    </section>
  </main>
</template>

<script>
import { scanTicketPayment } from '../api/tickets'

export default {
  name: 'TicketPayment',
  data() {
    return {
      status: 'loading',
      message: 'Đang xử lý thanh toán...'
    }
  },
  computed: {
    title() {
      if (this.status === 'success') return 'Thanh toán thành công'
      if (this.status === 'error') return 'Thanh toán không thành công'
      return 'Đang thanh toán'
    }
  },
  mounted() {
    this.payByQr()
  },
  methods: {
    async payByQr() {
      const orderId = this.$route.params.orderId
      const token = this.$route.query.token
      if (!orderId || !token) {
        this.status = 'error'
        this.message = 'Mã QR không hợp lệ.'
        return
      }

      const res = await scanTicketPayment(orderId, token)
      if (res.success) {
        this.status = 'success'
        this.message = 'Vé của bạn đã được thanh toán và đang chờ quản trị viên xác nhận.'
      } else {
        this.status = 'error'
        this.message = res.error || 'Không thể xử lý thanh toán từ mã QR.'
      }
    }
  }
}
</script>

<style scoped>
.payment-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: var(--tw-bg);
}

.payment-card {
  width: min(420px, 100%);
  background: #ffffff;
  border: 1px solid var(--tw-border);
  border-radius: 16px;
  box-shadow: var(--tw-shadow-sm);
  padding: 30px 24px;
  text-align: center;
}

.payment-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 900;
}

.payment-icon.loading {
  background: #eef2ff;
  color: #4f46e5;
}

.payment-icon.success {
  background: #dcfce7;
  color: #166534;
}

.payment-icon.error {
  background: #fee2e2;
  color: #991b1b;
}

.payment-card h1 {
  margin: 0 0 10px;
  color: var(--tw-text);
  font-size: 1.5rem;
}

.payment-card p {
  margin: 0 0 20px;
  color: var(--tw-muted);
  line-height: 1.55;
}

.payment-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--tw-primary);
  color: #ffffff;
  font-weight: 800;
  text-decoration: none;
}

.payment-link.secondary {
  background: #f1f5f9;
  color: var(--tw-text);
}
</style>
