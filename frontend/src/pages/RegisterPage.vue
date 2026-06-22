<template>
  <div class="register-page">
    <main class="auth-main">
      <div class="register-left">
        <img src="/Playground.jpg" alt="Playground" />
      </div>
      <div class="register-right">
        <div class="register-box">
          <img src="/Logo.jpg" alt="Logo" class="logo" />
          <h2>Tạo tài khoản mới để khám phá!</h2>

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
            type="email"
            v-model="email"
            placeholder="Email"
            autocomplete="email"
          />
        </div>

        <div class="input-wrap">
          <input
            type="tel"
            v-model="phone"
            placeholder="Số điện thoại"
            autocomplete="tel"
          />
        </div>

        <div class="input-wrap">
          <input
            type="password"
            v-model="password"
            placeholder="Mật khẩu"
            autocomplete="new-password"
          />
        </div>

        <div class="input-wrap">
          <input
            type="password"
            v-model="confirmPassword"
            placeholder="Xác nhận mật khẩu"
            autocomplete="new-password"
          />
        </div>

        <div class="input-wrap">
          <input
            type="text"
            v-model="parentName"
            placeholder="Họ tên phụ huynh"
            autocomplete="name"
          />
        </div>

        <div class="input-wrap">
          <input
            type="text"
            v-model="address"
            placeholder="Địa chỉ"
            autocomplete="street-address"
          />
        </div>

        <button class="tw-btn tw-btn-primary" @click="register" :disabled="isLoading">{{ isLoading ? 'Đang xử lý...' : 'Đăng ký' }}</button>
        <p class="note">Đã có tài khoản? <router-link to="/login">Đăng nhập</router-link></p>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { registerUser } from '../api/auth'

export default {
  name: 'RegisterPage',
  data() {
    return {
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      parentName: '',
      address: '',
      isLoading: false,
      errorMessage: ''
    }
  },
  methods: {
    async register() {
      this.errorMessage = ''
      
      // Validation
      if (!this.username || !this.email || !this.phone || !this.password || !this.confirmPassword || !this.parentName || !this.address) {
        this.errorMessage = 'Vui lòng điền đầy đủ thông tin'
        return
      }

      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Mật khẩu không trùng khớp'
        return
      }

      if (this.password.length < 6) {
        this.errorMessage = 'Mật khẩu phải ít nhất 6 ký tự'
        return
      }

      this.isLoading = true
      try {
        const response = await registerUser({
          username: this.username,
          email: this.email,
          phone: this.phone,
          password: this.password,
          parentName: this.parentName,
          address: this.address
        })

        if (response.success || response.message === 'User registered successfully') {
          this.$notify({
            title: 'Thành công!',
            message: 'Đăng ký tài khoản thành công. Vui lòng đăng nhập.',
            type: 'success',
            duration: 3000
          })
          
          // Redirect immediately
          this.$router.push('/login')
        } else {
          // Prefer backend error/details if provided
          const details = response.details || ''
          if (details && (details.includes('E11000') || details.toLowerCase().includes('duplicate key'))) {
            if (details.toLowerCase().includes('username')) this.errorMessage = 'Tên đăng nhập đã tồn tại'
            else if (details.toLowerCase().includes('email')) this.errorMessage = 'Email đã được sử dụng'
            else this.errorMessage = 'Tên đăng nhập hoặc email đã tồn tại'
          } else {
            this.errorMessage = response.error || response.details || response.message || 'Đăng ký thất bại'
          }
        }
      } catch (err) {
        this.errorMessage = 'Lỗi khi đăng ký: ' + (err.message || 'Vui lòng thử lại')
        console.error('Register error:', err)
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

.register-page {
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

.register-left {
  flex: 0 0 50%;
  height: auto;
  overflow: hidden;
  position: relative;
}

.register-left img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  display: block;
}

.register-left::after {
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

.register-right {
  flex: 0 0 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background: transparent;
  overflow-y: auto;
}

.register-box {
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

.register-box h2 {
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

.register-box input {
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

.register-box input::placeholder {
  color: #9ca3af;
}

.register-box input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.register-box button {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 1rem;
  margin-top: 8px;
}

.register-box button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.note {
  margin-top: 16px;
  font-size: 0.9rem;
  color: #6b7280;
}

.note a,
.note router-link {
  color: #111827;
  text-decoration: none;
  font-weight: 500;
}

.note router-link:hover {
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

  .register-left {
    flex: 0 0 auto;
    height: 220px;
  }

  .register-left img {
    object-position: center top;
  }

  .register-right {
    flex: 1 1 auto;
    padding: 28px 20px;
  }

  .register-box {
    max-width: 420px;
    margin-top: -20px;
  }
}

/* Tên đăng nhập */
.input-wrap input[type="text"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}

/* Email */
.input-wrap input[type="email"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}

/* Mật khẩu */
.input-wrap input[type="password"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-7V7a6 6 0 0 0-12 0v3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-8-3a4 4 0 0 1 8 0v3H10V7z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}

/* Họ tên phụ huynh */
.input-wrap input[placeholder="Họ tên phụ huynh"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}

/* Địa chỉ */
.input-wrap input[placeholder="Địa chỉ"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
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

.input-wrap input[type="tel"] {
  background-image: url('data:image/svg+xml;utf8,<svg fill="%239ca3af" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M6.6 10.8c1.4 2.7 3.9 5.1 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.5c0 .7-.5 1.2-1.2 1.2C10.4 22 2 13.6 2 3.4 2 2.7 2.5 2.2 3.2 2.2h3.5c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.7.6 4 .1.4 0 .9-.3 1.2l-1.6 2.2z"/></svg>');
  background-repeat: no-repeat;
  background-position: 14px center;
  background-size: 18px;
}
</style>
