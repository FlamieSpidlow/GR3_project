<template>
  <div class="edit-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Thông tin tài khoản</h1>
          <p>Cập nhật thông tin phụ huynh để TheWeekend gợi ý địa điểm phù hợp hơn.</p>
        </div>
      </section>

      <div class="tw-container-wide page-body">
        <form class="box tw-surface" @submit.prevent="save">
          <div class="avatar-section">
            <div class="avatar-preview">
              <img v-if="avatarPreview" :src="avatarPreview" alt="Ảnh đại diện" class="avatar-img" />
              <UserCircleIcon v-else class="avatar-placeholder" aria-hidden="true" />
            </div>
            <label class="file-input-label">
              <input type="file" @change="onFileChange" accept="image/*" class="file-input" />
              <span class="tw-btn tw-btn-outline file-btn">Chọn ảnh đại diện</span>
            </label>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>Họ và tên phụ huynh</span>
              <input type="text" v-model.trim="parentName" autocomplete="name" required />
            </label>

            <label class="field">
              <span>Email</span>
              <input type="email" v-model.trim="email" autocomplete="email" required />
            </label>

            <label class="field">
              <span>Số điện thoại</span>
              <input
                type="tel"
                v-model.trim="phone"
                autocomplete="tel"
                inputmode="tel"
                placeholder="Ví dụ: 0912345678"
                :aria-invalid="Boolean(phoneError)"
                required
              />
              <small v-if="phoneError" class="field-error">{{ phoneError }}</small>
            </label>

            <label class="field wide">
              <span>Địa chỉ</span>
              <input type="text" v-model.trim="address" autocomplete="street-address" required />
            </label>
          </div>

          <button class="tw-btn tw-btn-primary submit-btn" type="submit" :disabled="isLoading">
            {{ isLoading ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </form>
      </div>
    </main>
  </div>
</template>

<script>
import { UserCircleIcon } from '@heroicons/vue/24/outline'
import { getProfile, updateProfile } from '../api/auth'
import { getAuthUserRaw } from '../utils/authSession'

export default {
  name: 'EditProfile',
  components: { UserCircleIcon },
  data() {
    return {
      parentName: '',
      avatar: '',
      avatarPreview: '',
      address: '',
      email: '',
      phone: '',
      isLoading: false,
      errorMessage: ''
    }
  },
  computed: {
    phoneError() {
      if (!this.phone) return ''
      const normalized = this.phone.replace(/[\s.-]/g, '')
      if (!/^(0|\+84)(\d{9})$/.test(normalized)) {
        return 'Số điện thoại cần đúng định dạng Việt Nam, ví dụ 0912345678 hoặc +84912345678.'
      }
      return ''
    }
  },
  async mounted() {
    const res = await getProfile()
    if (res.success && res.user) {
      this.hydrate(res.user)
      return
    }

    const user = getAuthUserRaw()
    if (user) {
      this.hydrate(JSON.parse(user))
    } else {
      this.$router.push('/login')
    }
  },
  methods: {
    hydrate(user) {
      this.parentName = user.parentName || ''
      this.avatar = user.avatar || ''
      this.avatarPreview = user.avatar || ''
      this.address = user.address || ''
      this.email = user.email || ''
      this.phone = user.phone || ''
    },
    onFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        this.avatar = reader.result
        this.avatarPreview = reader.result
      }
      reader.readAsDataURL(file)
    },
    async save() {
      this.errorMessage = ''
      if (!this.parentName || !this.address || !this.email || !this.phone) {
        this.errorMessage = 'Vui lòng điền đầy đủ thông tin.'
        return
      }
      if (this.phoneError) {
        this.errorMessage = this.phoneError
        return
      }

      this.isLoading = true
      try {
        const payload = { parentName: this.parentName, address: this.address, email: this.email, phone: this.phone }
        if (this.avatar) payload.avatar = this.avatar
        const res = await updateProfile(payload)
        if (res.success) {
          const updatedUser = res.user || {}
          if (!updatedUser.avatar && this.avatarPreview) updatedUser.avatar = this.avatarPreview
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
          this.$notify({ title: 'Đã lưu thông tin', message: res.message || 'Thông tin tài khoản đã được cập nhật.', type: 'success' })
          this.$router.push('/')
        } else {
          this.errorMessage = res.error || res.details || 'Không thể cập nhật thông tin.'
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
.edit-page { background: var(--tw-bg); min-height: 100%; }
.content { padding: 0; }
.page-body { padding-top: 26px; padding-bottom: 46px; }
.page-hero { position: relative; padding: 28px 0 24px; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.35)); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px; font-size: 1.8rem; font-weight: 750; letter-spacing: 0; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 550; line-height: 1.5; }
.box { padding: 22px; width: 100%; max-width: 760px; margin: 0 auto; overflow: hidden; }
.avatar-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 22px; gap: 12px; }
.avatar-preview { width: 104px; height: 104px; border-radius: 50%; overflow: hidden; border: 1px solid var(--tw-border); display: flex; align-items: center; justify-content: center; background: #f8fafc; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar-placeholder { width: 56px; height: 56px; color: #94a3b8; }
.file-input { display: none; }
.file-btn { padding: 10px 14px; font-size: 0.95rem; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.field { display: grid; gap: 7px; color: var(--tw-text); font-weight: 700; }
.field.wide { grid-column: 1 / -1; }
.field input { width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid var(--tw-border); font-size: 0.95rem; outline: none; background: #fff; color: #111827; }
.field input:focus { border-color: var(--tw-primary); box-shadow: 0 0 0 3px rgba(79, 111, 143, 0.12); }
.field input[aria-invalid="true"] { border-color: #dc2626; }
.field-error { color: #b91c1c; font-weight: 600; line-height: 1.45; }
.submit-btn { width: 100%; margin-top: 18px; min-height: 46px; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.error-message { margin-top: 16px; padding: 12px; background-color: #fee2e2; color: #991b1b; border-radius: 8px; font-size: 0.9rem; border-left: 4px solid #dc2626; }
@media (max-width: 680px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
