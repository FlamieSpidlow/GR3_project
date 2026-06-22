<template>
  <div class="admin-activities-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Quản lý các hoạt động vui chơi</h1>
          <p>Thêm, cập nhật và ẩn hiện các hoạt động trên trang chủ</p>
        </div>
      </section>

      <section class="page-body tw-container-wide">
        <div class="toolbar">
          <div>
            <h2>Các hoạt động vui chơi</h2>
            <p>Ảnh hoạt động được tải lên trực tiếp từ máy.</p>
          </div>
          <button class="btn btn-primary" type="button" @click="openActivityModal()">Thêm hoạt động</button>
        </div>

        <div v-if="activitiesLoading" class="state-box">Đang tải hoạt động...</div>
        <div v-else-if="activitiesError" class="state-box error">{{ activitiesError }}</div>
        <div v-else-if="activities.length === 0" class="state-box">Chưa có hoạt động nào.</div>

        <div v-else class="activities-grid">
          <article v-for="activity in activities" :key="activity._id" class="activity-card">
            <div class="activity-image">
              <img :src="getImageUrl(activity.image)" :alt="activity.name" />
            </div>
            <div class="activity-info">
              <h3>{{ activity.name }}</h3>
              <span :class="['activity-status', activity.active ? 'active' : 'inactive']">
                {{ activity.active ? 'Đang hiển thị' : 'Đã ẩn' }}
              </span>
            </div>
            <div class="activity-actions">
              <button class="btn-small btn-edit" type="button" @click="openActivityModal(activity)">Sửa</button>
              <button class="btn-small btn-delete" type="button" @click="confirmDeleteActivity(activity)">Xóa</button>
            </div>
          </article>
        </div>
      </section>

      <div v-if="showActivityModal" class="modal-overlay" @click.self="closeActivityModal">
        <div class="modal-content modal-small">
          <h2>{{ editingActivityId ? 'Sửa hoạt động' : 'Thêm hoạt động' }}</h2>
          <form @submit.prevent="saveActivity">
            <div class="form-group">
              <label>Tên hoạt động *</label>
              <input v-model="activityForm.name" type="text" required placeholder="VD: Bơi lội" />
            </div>

            <div class="form-group">
              <label>Ảnh hoạt động</label>
              <input type="file" accept="image/*" @change="handleActivityImageUpload" />
              <p class="form-hint">{{ uploadingActivityImage ? 'Đang tải ảnh...' : 'Chọn ảnh từ máy để hiển thị trên trang chủ.' }}</p>
              <div v-if="activityForm.image" class="image-preview">
                <img :src="getImageUrl(activityForm.image)" alt="Ảnh hoạt động" />
              </div>
            </div>

            <div class="form-group checkbox-form-group">
              <label class="checkbox-inline">
                <input v-model="activityForm.active" type="checkbox" />
                Hiển thị trên trang chủ
              </label>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeActivityModal" class="btn btn-secondary">Hủy</button>
              <button type="submit" class="btn btn-primary" :disabled="uploadingActivityImage">
                {{ editingActivityId ? 'Cập nhật' : 'Thêm' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import {
  createActivity,
  deleteActivity,
  getAllActivities,
  updateActivity,
  uploadActivityImage
} from '../api/admin'
import { assetUrl } from '../utils/apiBase'
import { getAuthUser } from '../utils/authSession'

export default {
  name: 'AdminActivities',
  data() {
    return {
      activities: [],
      activitiesLoading: false,
      activitiesError: '',
      showActivityModal: false,
      editingActivityId: null,
      uploadingActivityImage: false,
      activityForm: {
        name: '',
        image: '',
        active: true
      }
    }
  },
  mounted() {
    this.checkAdmin()
    this.loadActivities()
  },
  methods: {
    checkAdmin() {
      const user = getAuthUser() || {}
      if (user.role !== 'admin') {
        this.$notify({ type: 'error', title: 'Không có quyền truy cập', message: 'Bạn cần tài khoản quản trị để mở trang này.' })
        this.$router.push('/')
      }
    },
    async loadActivities() {
      this.activitiesLoading = true
      this.activitiesError = ''
      const res = await getAllActivities()
      if (res && res.success) {
        this.activities = res.data || []
      } else {
        this.activities = []
        this.activitiesError = res?.error || 'Không thể tải danh sách hoạt động.'
      }
      this.activitiesLoading = false
    },
    openActivityModal(activity = null) {
      if (activity) {
        this.editingActivityId = activity._id
        this.activityForm = {
          name: activity.name || '',
          image: activity.image || '',
          active: activity.active !== false
        }
      } else {
        this.editingActivityId = null
        this.activityForm = {
          name: '',
          image: '',
          active: true
        }
      }
      this.showActivityModal = true
    },
    closeActivityModal() {
      this.showActivityModal = false
      this.editingActivityId = null
      this.uploadingActivityImage = false
      this.activityForm = {
        name: '',
        image: '',
        active: true
      }
    },
    async handleActivityImageUpload(event) {
      const file = event.target.files && event.target.files[0]
      if (!file) return

      this.uploadingActivityImage = true
      const res = await uploadActivityImage(file)
      this.uploadingActivityImage = false
      event.target.value = ''

      if (res && res.success && res.data?.imageUrl) {
        this.activityForm.image = res.data.imageUrl
        this.$notify({ type: 'success', title: 'Đã tải ảnh', message: 'Ảnh hoạt động đã được tải lên.' })
      } else {
        this.$notify({ type: 'error', title: 'Không thể tải ảnh', message: res?.error || 'Upload ảnh không thành công.' })
      }
    },
    async saveActivity() {
      const payload = {
        name: this.activityForm.name,
        image: this.activityForm.image,
        active: this.activityForm.active
      }
      const res = this.editingActivityId
        ? await updateActivity(this.editingActivityId, payload)
        : await createActivity(payload)

      if (res && res.success) {
        this.$notify({
          type: 'success',
          title: this.editingActivityId ? 'Đã cập nhật hoạt động' : 'Đã thêm hoạt động',
          message: 'Danh sách hoạt động vui chơi đã được lưu.'
        })
        this.closeActivityModal()
        await this.loadActivities()
      } else {
        this.$notify({ type: 'error', title: 'Không thể lưu hoạt động', message: res?.error || 'Đã có lỗi xảy ra.' })
      }
    },
    async confirmDeleteActivity(activity) {
      const confirmed = await this.$confirm({
        title: 'Xóa hoạt động',
        message: `Bạn có chắc muốn xóa hoạt động "${activity.name}"?`,
        confirmText: 'Xóa',
        tone: 'danger'
      })
      if (!confirmed) return
      const res = await deleteActivity(activity._id)
      if (res && res.success) {
        this.$notify({ type: 'success', title: 'Đã xóa hoạt động', message: 'Hoạt động đã được xóa khỏi trang chủ.' })
        await this.loadActivities()
      } else {
        this.$notify({ type: 'error', title: 'Không thể xóa hoạt động', message: res?.error || 'Đã có lỗi xảy ra.' })
      }
    },
    getImageUrl(imagePath) {
      if (!imagePath) return '/Playground.jpg'
      return assetUrl(imagePath)
    }
  }
}
</script>

<style scoped>
.admin-activities-page {
  background: var(--tw-bg);
  min-height: 100%;
}

.content { padding: 0; }

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 900; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 600; line-height: 1.5; }

.page-body { padding-top: 26px; padding-bottom: 46px; }

.toolbar {
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-lg);
  box-shadow: var(--tw-shadow-sm);
  padding: 18px;
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.toolbar h2 {
  margin: 0 0 5px;
  color: var(--tw-text);
}

.toolbar p {
  margin: 0;
  color: var(--tw-muted);
}

.state-box {
  background: #fff;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: var(--tw-muted);
  box-shadow: var(--tw-shadow-sm);
}

.state-box.error {
  color: #b91c1c;
  background: #fef2f2;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.activity-card {
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  box-shadow: var(--tw-shadow-sm);
  display: flex;
  flex-direction: column;
}

.activity-image {
  height: 150px;
  background: #f3f4f6;
}

.activity-image img,
.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.activity-info {
  padding: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.activity-info h3 {
  margin: 0;
  color: var(--tw-text);
  font-size: 1rem;
  line-height: 1.35;
}

.activity-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  min-height: 28px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  white-space: nowrap;
}

.activity-status.active {
  background: #dcfce7;
  color: #166534;
}

.activity-status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.activity-actions {
  margin-top: auto;
  padding: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--tw-border);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: var(--tw-radius-lg);
  box-shadow: var(--tw-shadow-lg);
  padding: 24px;
  width: min(100%, 520px);
}

.modal-content h2 {
  margin: 0 0 18px;
  color: var(--tw-text);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--tw-text);
  font-weight: 800;
}

.form-group input[type="text"],
.form-group input[type="file"] {
  width: 100%;
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--tw-text);
}

.form-hint {
  margin: 8px 0 0;
  color: var(--tw-muted);
  font-size: 0.9rem;
}

.image-preview {
  margin-top: 12px;
  width: 180px;
  height: 110px;
  border: 1px solid var(--tw-border);
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.checkbox-form-group {
  display: flex;
  align-items: center;
}

.checkbox-inline {
  display: inline-flex !important;
  align-items: center;
  gap: 8px;
  margin-bottom: 0 !important;
}

.checkbox-inline input {
  width: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 800;
}

.btn-primary {
  background: var(--tw-primary);
  color: #fff;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-small {
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-weight: 800;
  cursor: pointer;
}

.btn-edit {
  background: #e0f2fe;
  color: #075985;
}

.btn-delete {
  background: #fee2e2;
  color: #991b1b;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .toolbar,
  .activity-info {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
