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

      <router-link v-if="status === 'success'" to="/tickets" class="payment-link">
        Xem vé của tôi
      </router-link>
      <router-link v-else-if="status === 'error'" to="/tickets" class="payment-link secondary">
        Về Vé của tôi
      </router-link>
    </section>
  </main>
</template>

<script>
import { getTicketPaymentStatus } from '../api/tickets'

export default {
  name: 'TicketPayment',
  data() {
    return {
      status: 'loading',
      message: 'Đang kiểm tra trạng thái thanh toán...'
    }
  },
  computed: {
    title() {
      if (this.status === 'success') return 'Đặt vé thành công'
      if (this.status === 'error') return 'Chưa xác nhận thanh toán'
      return 'Đang kiểm tra'
    }
  },
  mounted() {
    this.checkPayment()
  },
  methods: {
    async checkPayment() {
      const bookingId = this.$route.params.orderId
      if (!bookingId) {
        this.status = 'error'
        this.message = 'Không tìm thấy mã đặt vé.'
        return
      }
      const res = await getTicketPaymentStatus(bookingId)
      if (res.success && res.data?.status === 'paid') {
        this.status = 'success'
        this.message = 'Thanh toán đã được xác minh. Vé điện tử đã sẵn sàng.'
        this.$notify({
          type: 'success',
          title: 'Thanh toán thành công',
          message: 'Vé điện tử đã sẵn sàng trong mục Vé của tôi.',
          duration: 4000,
          persist: false
        })
        return
      }
      this.status = 'error'
      this.message = res.error || 'Thanh toán chưa được xác minh. Vui lòng kiểm tra lại sau.'
      this.$notify({
        type: 'warning',
        title: 'Chưa xác nhận thanh toán',
        message: this.message,
        duration: 4000,
        persist: false
      })
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
  border-radius: 14px;
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
  font-weight: 800;
}

.payment-icon.loading { background: #eef2ff; color: #4f46e5; }
.payment-icon.success { background: #dcfce7; color: #166534; }
.payment-icon.error { background: #fee2e2; color: #991b1b; }

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
  font-weight: 700;
  text-decoration: none;
}

.payment-link.secondary {
  background: #f1f5f9;
  color: var(--tw-text);
}
</style>
