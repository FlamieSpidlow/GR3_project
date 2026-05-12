<template>
  <div class="change-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Đổi mật khẩu</h1>
          <p>Nhập mật khẩu hiện tại và mật khẩu mới</p>
        </div>
      </section>

      <div class="tw-container-wide page-body">
        <div class="box tw-surface">
          <div class="input-wrap">
            <input type="password" v-model="currentPassword" placeholder="Mật khẩu hiện tại" autocomplete="current-password" />
          </div>
          <div class="input-wrap">
            <input type="password" v-model="newPassword" placeholder="Mật khẩu mới" autocomplete="new-password" />
          </div>
          <div class="input-wrap">
            <input type="password" v-model="confirmPassword" placeholder="Xác nhận mật khẩu" autocomplete="new-password" />
          </div>
          <button class="tw-btn tw-btn-primary" @click="change" :disabled="isLoading">
            {{ isLoading ? 'Đang xử lý...' : 'Đổi mật khẩu' }}
          </button>
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { changePassword } from '../api/auth'

export default {
  name: 'ChangePassword',
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      isLoading: false,
      errorMessage: ''
    }
  },
  methods: {
    async change() {
      this.errorMessage = ''
      if (!this.currentPassword || !this.newPassword || !this.confirmPassword) { this.errorMessage = 'Vui lòng điền đầy đủ thông tin'; return }
      if (this.newPassword !== this.confirmPassword) { this.errorMessage = 'Mật khẩu mới không khớp'; return }
      this.isLoading = true
      try {
        const res = await changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword })
        if (res.success) {
          this.$notify({ title: 'Thành công', message: res.message || 'Mật khẩu đã được đổi', type: 'success' })
          this.$router.push('/profile/edit')
        } else {
          this.errorMessage = res.error || res.details || 'Không thể đổi mật khẩu'
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
*, *::before, *::after { box-sizing: border-box; }

.change-page { background: var(--tw-bg); min-height: 100%; display: flex; flex-direction: column; }
.site-header { position: relative; z-index: 10; }
.content { padding: 0; }
.page-body { padding-top: 26px; padding-bottom: 46px; }

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 600; line-height: 1.5; }

.box {
  padding: 22px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.input-wrap { margin-bottom: 12px; }

.box input {
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

.box input::placeholder { color: #9ca3af; }

.box input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.box button {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 1rem;
  margin-top: 6px;
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

.site-footer { background: #fff; border-top: 1px solid var(--tw-border); padding: 14px 16px; text-align: center; color: #6b7280; font-size: 0.9rem; }
</style>
