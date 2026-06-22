<template>
  <div class="edit-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Chỉnh sửa thông tin</h1>
          <p>Cập nhật thông tin phụ huynh, địa chỉ và ảnh đại diện</p>
        </div>
      </section>

      <div class="tw-container-wide page-body">
        <div class="box tw-surface">
          <div class="avatar-section">
            <div class="avatar-preview">
              <img
                v-if="avatarPreview"
                :src="avatarPreview"
                alt="Avatar preview"
                class="avatar-img"
              />
              <div v-else class="avatar-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>
            <label class="file-input-label">
              <input
                type="file"
                @change="onFileChange"
                accept="image/*"
                class="file-input"
              />
              <span class="tw-btn tw-btn-outline file-btn">Chọn ảnh</span>
            </label>
          </div>

          <div class="input-wrap">
            <input type="text" v-model="parentName" placeholder="Họ và tên phụ huynh" />
          </div>
          <div class="input-wrap">
            <input type="text" v-model="address" placeholder="Địa chỉ" />
          </div>
          <div class="input-wrap">
            <input type="email" v-model="email" placeholder="Email" autocomplete="email" />
          </div>
          <div class="input-wrap">
            <input type="tel" v-model="phone" placeholder="Số điện thoại" autocomplete="tel" />
          </div>

          <button class="tw-btn tw-btn-primary" @click="save" :disabled="isLoading">
            {{ isLoading ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { updateProfile, getProfile } from '../api/auth'
import { getAuthUserRaw } from '../utils/authSession'

export default {
  name: 'EditProfile',
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
  async mounted() {
    // First try to get latest profile from API
    const res = await getProfile()
    if (res.success && res.user) {
      const u = res.user
      this.parentName = u.parentName || ''
      this.avatar = u.avatar || ''
      this.avatarPreview = u.avatar || ''
      this.address = u.address || ''
      this.email = u.email || ''
      this.phone = u.phone || ''
    } else {
      // Fallback to current session data
      const user = getAuthUserRaw()
      if (user) {
        const u = JSON.parse(user)
        this.parentName = u.parentName || ''
        this.avatar = u.avatar || ''
        this.avatarPreview = u.avatar || ''
        this.address = u.address || ''
        this.email = u.email || ''
        this.phone = u.phone || ''
      } else {
        // If no user in session, redirect to login
        this.$router.push('/login')
      }
    }
  },
  methods: {
    onFileChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        // save base64 data URL
        this.avatar = reader.result
        this.avatarPreview = reader.result
      }
      reader.readAsDataURL(file)
    },
    async save() {
      this.errorMessage = ''
      if (!this.parentName || !this.address || !this.email || !this.phone) { this.errorMessage = 'Vui lòng điền đầy đủ thông tin'; return }
      this.isLoading = true
      try {
        const payload = { parentName: this.parentName, address: this.address, email: this.email, phone: this.phone }
        if (this.avatar) payload.avatar = this.avatar
        const res = await updateProfile(payload)
        if (res.success) {
          // update current session user
          // ensure local user data keeps avatar
          const updatedUser = res.user || {}
          if (!updatedUser.avatar && this.avatarPreview) updatedUser.avatar = this.avatarPreview
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
          this.$notify({ title: 'Thành công', message: res.message || 'Cập nhật thông tin thành công', type: 'success' })
          this.$router.push('/')
        } else {
          this.errorMessage = res.error || res.details || 'Không thể cập nhật'
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

.edit-page { background: var(--tw-bg); min-height: 100%; display: flex; flex-direction: column; }
.site-header { position: relative; z-index: 10; }
.content { padding: 0; }
.page-body { padding-top: 26px; padding-bottom: 46px; }
.box {
  padding: 22px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  overflow: hidden;
}

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 600; line-height: 1.5; }

/* Avatar Section */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-placeholder {
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  width: 100%;
  height: 100%;
}

.file-input-label {
  position: relative;
  cursor: pointer;
}

.file-input {
  display: none;
}

.file-btn { padding: 10px 14px; font-size: 0.95rem; }

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

.box button:disabled { opacity: 0.6; cursor: not-allowed; }

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
