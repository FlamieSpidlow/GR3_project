<template>
  <div class="change-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Bảo mật tài khoản</h1>
          <p>Đổi mật khẩu định kỳ để bảo vệ thông tin và lịch sử đặt vé của gia đình.</p>
        </div>
      </section>

      <div class="tw-container-wide page-body">
        <form class="box tw-surface" @submit.prevent="change">
          <label class="field" for="current-password">
            <span>Mật khẩu hiện tại</span>
            <div class="password-control">
              <input
                id="current-password"
                :type="visibility.current ? 'text' : 'password'"
                v-model="currentPassword"
                autocomplete="current-password"
              />
              <button type="button" class="toggle-password" @click="visibility.current = !visibility.current" :aria-label="visibility.current ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
                <EyeSlashIcon v-if="visibility.current" aria-hidden="true" />
                <EyeIcon v-else aria-hidden="true" />
              </button>
            </div>
          </label>

          <label class="field" for="new-password">
            <span>Mật khẩu mới</span>
            <div class="password-control">
              <input
                id="new-password"
                :type="visibility.next ? 'text' : 'password'"
                v-model="newPassword"
                autocomplete="new-password"
              />
              <button type="button" class="toggle-password" @click="visibility.next = !visibility.next" :aria-label="visibility.next ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
                <EyeSlashIcon v-if="visibility.next" aria-hidden="true" />
                <EyeIcon v-else aria-hidden="true" />
              </button>
            </div>
            <small class="field-hint">Tối thiểu 6 ký tự.</small>
          </label>

          <label class="field" for="confirm-password">
            <span>Nhập lại mật khẩu mới</span>
            <div class="password-control" :class="{ invalid: confirmPassword && newPassword !== confirmPassword }">
              <input
                id="confirm-password"
                :type="visibility.confirm ? 'text' : 'password'"
                v-model="confirmPassword"
                autocomplete="new-password"
                :aria-invalid="Boolean(confirmPassword && newPassword !== confirmPassword)"
              />
              <button type="button" class="toggle-password" @click="visibility.confirm = !visibility.confirm" :aria-label="visibility.confirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
                <EyeSlashIcon v-if="visibility.confirm" aria-hidden="true" />
                <EyeIcon v-else aria-hidden="true" />
              </button>
            </div>
            <small v-if="confirmPassword && newPassword !== confirmPassword" class="field-error">Mật khẩu nhập lại chưa khớp.</small>
          </label>

          <button class="tw-btn tw-btn-primary submit-btn" type="submit" :disabled="isLoading">
            {{ isLoading ? 'Đang xử lý...' : 'Đổi mật khẩu' }}
          </button>
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </form>
      </div>
    </main>
  </div>
</template>

<script>
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { changePassword } from '../api/auth'

export default {
  name: 'ChangePassword',
  components: { EyeIcon, EyeSlashIcon },
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      isLoading: false,
      errorMessage: '',
      visibility: {
        current: false,
        next: false,
        confirm: false
      }
    }
  },
  methods: {
    async change() {
      this.errorMessage = ''
      if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
        this.errorMessage = 'Vui lòng điền đầy đủ thông tin.'
        return
      }
      if (this.newPassword.length < 6) {
        this.errorMessage = 'Mật khẩu mới cần tối thiểu 6 ký tự.'
        return
      }
      if (this.newPassword !== this.confirmPassword) {
        this.errorMessage = 'Mật khẩu mới không khớp.'
        return
      }

      this.isLoading = true
      try {
        const res = await changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword })
        if (res.success) {
          this.$notify({ title: 'Đã đổi mật khẩu', message: res.message || 'Mật khẩu mới đã được lưu.', type: 'success' })
          this.$router.push('/profile/edit')
        } else {
          this.errorMessage = res.error || res.details || 'Không thể đổi mật khẩu.'
        }
      } catch (err) {
        this.errorMessage = 'Lỗi: ' + (err.message || 'Vui lòng thử lại.')
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }
.change-page { background: var(--tw-bg); min-height: 100%; }
.content { padding: 0; }
.page-body { padding-top: 26px; padding-bottom: 46px; }
.page-hero { position: relative; padding: 28px 0 24px; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.35)); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px; font-size: 1.8rem; font-weight: 750; letter-spacing: 0; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 550; line-height: 1.5; }
.box { padding: 22px; width: 100%; max-width: 640px; margin: 0 auto; display: grid; gap: 14px; }
.field { display: grid; gap: 7px; color: var(--tw-text); font-weight: 700; }
.password-control { display: flex; align-items: stretch; border: 1px solid var(--tw-border); border-radius: 8px; background: #ffffff; overflow: hidden; }
.password-control:focus-within { border-color: var(--tw-primary); box-shadow: 0 0 0 3px rgba(79, 111, 143, 0.12); }
.password-control.invalid { border-color: #dc2626; }
.password-control input { flex: 1; min-width: 0; border: 0; padding: 12px 14px; font-size: 0.95rem; outline: none; color: #111827; }
.toggle-password { width: 46px; border: 0; border-left: 1px solid var(--tw-border); background: #ffffff; color: var(--tw-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.toggle-password svg { width: 20px; height: 20px; }
.field-error { color: #b91c1c; font-weight: 600; line-height: 1.45; }
.field-hint { color: var(--tw-muted); font-weight: 550; line-height: 1.45; }
.submit-btn { width: 100%; min-height: 46px; margin-top: 4px; }
.error-message { padding: 12px; background-color: #fee2e2; color: #991b1b; border-radius: 8px; font-size: 0.9rem; border-left: 4px solid #dc2626; }
</style>
