<template>
  <div class="login-page">
    <main class="auth-main">
      <div class="login-left">
        <img src="/Playground.jpg" alt="Playground" />
      </div>
      <div class="login-right">
        <div class="login-box">
          <img src="/Logo.jpg" alt="Logo" class="logo" />
          <h2>Chào mừng đến với TheWeekend!</h2>
          <div class="input-wrap">
            <input
              type="text"
              v-model="username"
              placeholder="Tên đăng nhập"
              autocomplete="username"
            />
          </div>
          <div class="input-wrap">
            <input
              type="password"
              v-model="password"
              placeholder="Mật khẩu"
              autocomplete="current-password"
            />
          </div>
          <button class="tw-btn tw-btn-primary" @click="login" :disabled="isLoading">
            {{ isLoading ? 'Đang xử lý...' : 'Đăng nhập' }}
          </button>
          <p class="note">Chưa có tài khoản? <router-link to="/register">Đăng ký</router-link> • <router-link to="/forgot">Quên mật khẩu?</router-link></p>

          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { loginUser } from '../api/auth'
import { setAuthSession } from '../utils/authSession'

export default {
  name: 'LoginPage',
  data() {
    return {
      username: '',
      password: '',
      isLoading: false,
      errorMessage: ''
    }
  },
  methods: {
    async login() {
      this.errorMessage = ''

      // Validation
      if (!this.username || !this.password) {
        this.errorMessage = 'Vui lòng nhập tên đăng nhập và mật khẩu'
        return
      }

      this.isLoading = true
      try {
        const response = await loginUser({
          username: this.username,
          password: this.password
        })

        if (response.success || response.token) {
          setAuthSession(response.token, response.user)

          this.$notify({
            title: 'Thành công!',
            message: 'Đăng nhập thành công. Chào mừng bạn!',
            type: 'success',
            duration: 3000
          })

          const redirectPath = typeof this.$route.query.redirect === 'string'
            ? this.$route.query.redirect
            : '/'
          this.$router.push(redirectPath)
        } else {
          this.errorMessage = response.error || response.details || response.message || 'Đăng nhập thất bại'
        }
      } catch (err) {
        this.errorMessage = 'Lỗi khi đăng nhập: ' + (err.message || 'Vui lòng thử lại')
        console.error('Login error:', err)
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

.login-page {
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

.login-left {
  flex: 0 0 50%;
  height: auto;
  overflow: hidden;
  position: relative;
}

.login-left img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  display: block;
}

.login-left::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 20%; /* vùng mờ bên phải */
  height: 100%;
  backdrop-filter: blur(3px); /* độ nhòe */
  -webkit-backdrop-filter: blur(14px);
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.8) 90%,
    rgba(255, 255, 255, 1) 100%
  );
  pointer-events: none;
}


.login-right {
  flex: 0 0 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background: transparent;
}

.login-box {
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

.login-box h2 {
  margin: 0 0 28px;
  color: #111827;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.input-wrap {
  position: relative;
  margin-bottom: 16px;
}

.login-box input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 0.95rem;
  outline: none;
  background-color: #fff;
  transition: border-color 0.2s ease;
  color: #111827;
}

.login-box input::placeholder {
  color: #9ca3af;
}

.login-box input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.input-wrap input[type="text"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}

.input-wrap input[type="password"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-7V7a6 6 0 0 0-12 0v3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-8-3a4 4 0 0 1 8 0v3H10V7z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}

.login-box button {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 1rem;
  margin-top: 8px;
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

.login-box button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 900px) {
  .auth-main { flex-direction: column; }

  .login-left {
    flex: 0 0 auto;
    height: 220px;
  }

  .login-left img {
    object-position: center top;
  }

  .login-right {
    flex: 1 1 auto;
    padding: 28px 20px;
  }

  .login-box {
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
