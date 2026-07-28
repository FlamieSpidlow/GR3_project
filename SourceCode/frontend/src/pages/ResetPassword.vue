<template>
  <div class="reset-page">
    <main class="auth-main">
      <div class="reset-left">
        <img src="/Playground.jpg" alt="Playground" />
      </div>
      <div class="reset-right">
        <div class="reset-box">
          <img src="/Logo.jpg" alt="Logo" class="logo" />
          <h2>Đặt lại mật khẩu</h2>
          <p class="subtitle">Nhập mã xác thực đã nhận và mật khẩu mới</p>

          <div class="input-wrap">
            <input type="email" v-model="email" placeholder="Email" autocomplete="email" />
          </div>
          <div class="input-wrap">
            <input type="text" v-model="code" placeholder="Mã xác thực" autocomplete="one-time-code" />
          </div>
          <div class="input-wrap">
            <input type="password" v-model="newPassword" placeholder="Mật khẩu mới" autocomplete="new-password" />
          </div>
          <div class="input-wrap">
            <input type="password" v-model="confirmPassword" placeholder="Xác nhận mật khẩu" autocomplete="new-password" />
          </div>

          <button class="tw-btn tw-btn-primary" @click="confirmReset" :disabled="isLoading">
            {{ isLoading ? 'Đang xử lý...' : 'Xác nhận' }}
          </button>
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { resetPassword } from '../api/auth'

export default {
  name: 'ResetPassword',
  data() {
    return {
      email: this.$route.query.email || '',
      code: '',
      newPassword: '',
      confirmPassword: '',
      isLoading: false,
      errorMessage: ''
    }
  },
  methods: {
    async confirmReset() {
      this.errorMessage = ''
      if (!this.email || !this.code || !this.newPassword || !this.confirmPassword) { this.errorMessage = 'Vui lòng điền đầy đủ thông tin'; return }
      if (this.newPassword !== this.confirmPassword) { this.errorMessage = 'Mật khẩu không trùng khớp'; return }
      this.isLoading = true
      try {
        const res = await resetPassword({ email: this.email, code: this.code, newPassword: this.newPassword })
        if (res.success) {
          this.$notify({ title: 'Thành công', message: res.message || 'Mật khẩu đã được đổi', type: 'success' })
          this.$router.push('/login')
        } else {
          this.errorMessage = res.error || 'Không thể đặt lại mật khẩu'
        }
      } catch (err) {
        this.errorMessage = 'Lỗi: ' + (err.message || 'Vui lòng thử lại')
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>

<style scoped>
*, *::before, *::after {
  box-sizing: border-box;
}

.reset-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--tw-bg);
}

.auth-main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.reset-left {
  flex: 0 0 50%;
  height: auto;
  overflow: hidden;
  position: relative;
}

.reset-left img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  display: block;
}

.reset-left::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 20%;
  height: 100%;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(14px);
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.8) 90%,
    rgba(255, 255, 255, 1) 100%
  );
  pointer-events: none;
}

.reset-right {
  flex: 0 0 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background: transparent;
}

.reset-box {
  background: #ffffff;
  padding: 40px 36px;
  border-radius: var(--tw-radius-lg);
  border: 1px solid var(--tw-border);
  box-shadow: var(--tw-shadow-md);
  width: 100%;
  max-width: 480px;
  text-align: center;
}

.logo {
  max-width: 400px;
  width: 100%;
  height: auto;
  margin-bottom: 8px;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.reset-box h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.subtitle {
  margin: 0 0 22px;
  color: #6b7280;
  font-size: 0.95rem;
}

.input-wrap {
  position: relative;
  margin-bottom: 12px;
}

.reset-box input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 0.95rem;
  outline: none;
  background-color: #fff;
  transition: border-color 0.2s ease;
  color: #111827;
}

.reset-box input::placeholder {
  color: #9ca3af;
}

.reset-box input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.reset-box button {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 1rem;
  margin-top: 6px;
}

.reset-box button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background-color: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  font-size: 0.9rem;
  border-left: 4px solid #dc2626;
}

@media (max-width: 900px) {
  .auth-main { flex-direction: column; }

  .reset-left {
    flex: 0 0 auto;
    height: 220px;
  }

  .reset-left img {
    object-position: center top;
  }

  .reset-right {
    flex: 1 1 auto;
    padding: 28px 20px;
  }

  .reset-box {
    max-width: 420px;
    margin-top: -20px;
  }
}

.site-footer {
  position: relative;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
  background: #ffffff;
  border-top: 1px solid var(--tw-border);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.site-header { position: relative; z-index: 10; }
</style>
