<template>
  <div class="forgot-page">
    <main class="auth-main">
      <div class="forgot-left">
        <img src="/Playground.jpg" alt="Playground" />
      </div>
      <div class="forgot-right">
        <div class="forgot-box">
          <img src="/Logo.jpg" alt="Logo" class="logo" />
          <h2>Quên mật khẩu</h2>
          <p class="subtitle">Nhập email đã đăng ký để nhận mã xác thực</p>
          <div class="input-wrap">
            <input
              type="email"
              v-model="email"
              placeholder="Email"
              @keyup.enter="sendCode"
            />
          </div>
          <button class="tw-btn tw-btn-primary" @click="sendCode" :disabled="isLoading">
            {{ isLoading ? 'Đang gửi...' : 'Gửi mã xác thực' }}
          </button>
          <p class="note">
            <router-link to="/login">← Quay lại đăng nhập</router-link>
          </p>
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { forgotPassword } from '../api/auth'

export default {
  name: 'ForgotPassword',
  data() {
    return {
      email: '',
      isLoading: false,
      errorMessage: ''
    }
  },
  methods: {
    async sendCode() {
      this.errorMessage = ''
      if (!this.email) { this.errorMessage = 'Vui lòng nhập email'; return }
      this.isLoading = true
      try {
        const res = await forgotPassword(this.email)
        if (res.success) {
          this.$notify({ title: 'Đã gửi', message: res.message || 'Mã đã được gửi', type: 'success' })
          // For dev when API returns code, log it
          if (res.code) console.warn('DEV reset code:', res.code)
          this.$router.push({ path: '/reset', query: { email: this.email } })
        } else {
          this.errorMessage = res.error || 'Không thể gửi mã'
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

.forgot-page {
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

.forgot-left {
  flex: 0 0 50%;
  height: auto;
  overflow: hidden;
  position: relative;
}

.forgot-left img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  display: block;
}

.forgot-left::after {
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

.forgot-right {
  flex: 0 0 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background: transparent;
}

.forgot-box {
  background: #ffffff;
  padding: 40px 36px;
  border-radius: var(--tw-radius-lg);
  border: 1px solid var(--tw-border);
  box-shadow: var(--tw-shadow-md);
  width: 100%;
  max-width: 440px;
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

.forgot-box h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.subtitle {
  margin: 0 0 24px;
  color: #6b7280;
  font-size: 0.95rem;
}

.input-wrap {
  position: relative;
  margin-bottom: 16px;
}

.forgot-box input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 0.95rem;
  outline: none;
  background-color: #fff;
  transition: border-color 0.2s ease;
  color: #111827;
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}

.forgot-box input::placeholder {
  color: #9ca3af;
}

.forgot-box input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.forgot-box button {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 1rem;
  margin-top: 8px;
}

.forgot-box button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.note {
  margin-top: 16px;
  font-size: 0.9rem;
  color: #6b7280;
}

.note a {
  color: #111827;
  text-decoration: none;
  font-weight: 500;
}

.note a:hover {
  opacity: 0.8;
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

  .forgot-left {
    flex: 0 0 auto;
    height: 220px;
  }

  .forgot-left img {
    object-position: center top;
  }

  .forgot-right {
    flex: 1 1 auto;
    padding: 28px 20px;
  }

  .forgot-box {
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
