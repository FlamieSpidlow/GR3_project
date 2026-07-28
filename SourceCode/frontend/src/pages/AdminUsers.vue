<template>
  <div class="admin-users-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Quản lý người dùng</h1>
          <p>Xem, thêm, sửa, xóa người dùng</p>
        </div>
      </section>

      <div class="admin-container tw-container-wide page-body">
        <div class="page-header">
          <h2>Danh sách người dùng</h2>
          <div class="header-actions">
            <input v-model.trim="searchQuery" class="filter-input" type="search" placeholder="Tìm tên, email, số điện thoại..." />
            <select v-model="roleFilter" class="filter-input">
              <option value="">Tất cả vai trò</option>
              <option value="user">Người dùng</option>
              <option value="staff">Nhân viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
            <button @click="showAddModal = true" class="tw-btn tw-btn-primary">+ Thêm người dùng</button>
          </div>
        </div>

        <div v-if="isLoading" class="loading">Đang tải...</div>
        <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <EmptyState
          v-else-if="filteredUsers.length === 0"
          title="Không có người dùng"
          message="Thử đổi từ khóa tìm kiếm hoặc bộ lọc vai trò."
        />

        <div v-else class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Họ tên phụ huynh</th>
                <th>Địa chỉ</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user._id">
                <td>{{ user.username }}</td>
                <td>
                  <a v-if="user.email" :href="mailtoUrl(user.email)" class="info-link">{{ formatEmail(user.email) }}</a>
                  <span v-else class="muted-text">Chưa cập nhật</span>
                </td>
                <td>
                  <a v-if="isValidPhone(user.phone)" :href="telUrl(user.phone)" class="info-link">{{ formatPhone(user.phone) }}</a>
                  <span v-else-if="user.phone" class="warning-text">Sai định dạng</span>
                  <span v-else class="muted-text">Chưa cập nhật</span>
                </td>
                <td>{{ user.parentName || 'Chưa cập nhật' }}</td>
                <td>{{ user.address || 'Chưa cập nhật' }}</td>
                <td><StatusBadge :status="user.role" /></td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td class="actions">
                  <ActionButton :icon="PencilSquareIcon" tone="muted" title="Sửa người dùng" @click="editUser(user)" />
                  <ActionButton :icon="TrashIcon" tone="danger" title="Xóa người dùng" @click="confirmDelete(user)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal Thêm/Sửa người dùng -->
        <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModals">
          <div class="modal-content">
            <h2>{{ showAddModal ? 'Thêm người dùng mới' : 'Sửa thông tin người dùng' }}</h2>
            <form @submit.prevent="showAddModal ? addUser() : updateUser()">
              <div class="form-group">
                <label>Username *</label>
                <input v-model="formData.username" type="text" required :disabled="showEditModal" />
              </div>
              <div class="form-group">
                <label>Email *</label>
                <input v-model="formData.email" type="email" required />
              </div>
              <div class="form-group">
                <label>Số điện thoại *</label>
                <input v-model="formData.phone" type="tel" required />
              </div>
              <div class="form-group" v-if="showAddModal">
                <label>Mật khẩu *</label>
                <input v-model="formData.password" type="password" required />
              </div>
              <div class="form-group">
                <label>Họ tên phụ huynh *</label>
                <input v-model="formData.parentName" type="text" required />
              </div>
              <div class="form-group">
                <label>Địa chỉ *</label>
                <input v-model="formData.address" type="text" required />
              </div>
              <div class="modal-actions">
                <button type="button" @click="closeModals" class="tw-btn tw-btn-outline">Hủy</button>
                <button type="submit" class="tw-btn tw-btn-primary">{{ showAddModal ? 'Thêm' : 'Cập nhật' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { getAllUsers, createUser, updateUser, deleteUser } from '../api/admin'
import { getAuthUser } from '../utils/authSession'
import { formatEmail, formatPhone, mailtoUrl, telUrl } from '../utils/infoFormatter'
import ActionButton from '../components/ActionButton.vue'
import EmptyState from '../components/EmptyState.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'

export default {
  name: 'AdminUsers',
  components: {
    ActionButton,
    EmptyState,
    StatusBadge
  },
  data() {
    return {
      PencilSquareIcon,
      TrashIcon,
      users: [],
      isLoading: false,
      errorMessage: '',
      searchQuery: '',
      roleFilter: '',
      showAddModal: false,
      showEditModal: false,
      formData: {
        username: '',
        email: '',
        phone: '',
        password: '',
        parentName: '',
        address: ''
      },
      editingUserId: null
    }
  },
  computed: {
    filteredUsers() {
      const query = String(this.searchQuery || '').toLowerCase()
      return this.users.filter(user => {
        const matchesRole = !this.roleFilter || user.role === this.roleFilter
        const text = [
          user.username,
          user.email,
          user.phone,
          user.parentName,
          user.address
        ].join(' ').toLowerCase()
        return matchesRole && (!query || text.includes(query))
      })
    }
  },
  mounted() {
    this.checkAdmin()
    this.loadUsers()
  },
  methods: {
    formatEmail,
    formatPhone,
    mailtoUrl,
    telUrl,
    isValidPhone(value) {
      const digits = String(value || '').replace(/\D/g, '')
      return /^(0|\+?84)?\d{9,10}$/.test(String(value || '').trim()) && digits.length >= 9 && digits.length <= 11
    },
    checkAdmin() {
      const user = getAuthUser() || {}
      if (user.role !== 'admin') {
        this.$notify({ type: 'error', title: 'Không có quyền truy cập', message: 'Bạn cần tài khoản quản trị để mở trang này.' })
        this.$router.push('/')
      }
    },
    async loadUsers() {
      this.isLoading = true
      this.errorMessage = ''
      const res = await getAllUsers()
      if (res.success) {
        this.users = res.data
      } else {
        this.errorMessage = res.error || 'Lỗi tải danh sách người dùng'
      }
      this.isLoading = false
    },
    async addUser() {
      const res = await createUser(this.formData)
      if (res.success) {
        this.$notify({ type: 'success', title: 'Đã thêm người dùng', message: 'Người dùng mới đã được tạo thành công.' })
        this.closeModals()
        this.loadUsers()
      } else {
        this.$notify({ type: 'error', title: 'Không thể thêm người dùng', message: res.error || 'Đã có lỗi xảy ra.' })
      }
    },
    editUser(user) {
      this.editingUserId = user._id
      this.formData = {
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        password: '',
        parentName: user.parentName,
        address: user.address
      }
      this.showEditModal = true
    },
    async updateUser() {
      const dataToUpdate = { ...this.formData }
      delete dataToUpdate.password // Không gửi password
      const res = await updateUser(this.editingUserId, dataToUpdate)
      if (res.success) {
        this.$notify({ type: 'success', title: 'Đã cập nhật người dùng', message: 'Thông tin người dùng đã được lưu.' })
        this.closeModals()
        this.loadUsers()
      } else {
        this.$notify({ type: 'error', title: 'Không thể cập nhật người dùng', message: res.error || 'Đã có lỗi xảy ra.' })
      }
    },
    async confirmDelete(user) {
      const confirmed = await this.$confirm({
        title: 'Xóa người dùng',
        message: `Bạn có chắc muốn xóa người dùng "${user.username}"?`,
        confirmText: 'Xóa',
        tone: 'danger'
      })
      if (confirmed) {
        this.deleteUserById(user._id)
      }
    },
    async deleteUserById(id) {
      const res = await deleteUser(id)
      if (res.success) {
        this.$notify({ type: 'success', title: 'Đã xóa người dùng', message: 'Người dùng đã được xóa khỏi hệ thống.' })
        this.loadUsers()
      } else {
        this.$notify({ type: 'error', title: 'Không thể xóa người dùng', message: res.error || 'Đã có lỗi xảy ra.' })
      }
    },
    closeModals() {
      this.showAddModal = false
      this.showEditModal = false
      this.formData = {
        username: '',
        email: '',
        phone: '',
        password: '',
        parentName: '',
        address: ''
      }
      this.editingUserId = null
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleDateString('vi-VN')
    }
  }
}
</script>

<style scoped>
.admin-users-page {
  background: var(--tw-bg);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.site-header {
  position: relative;
  z-index: 10;
}

.content { padding: 0; }

.admin-container {
  padding: 0 0 0 0;
}

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 600; line-height: 1.5; }

.page-body { padding-top: 26px; padding-bottom: 46px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.page-header h2 { margin: 0; font-size: 1.25rem; font-weight: 900; letter-spacing: -0.02em; color: #111827; }

.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.filter-input {
  min-width: 190px;
  border: 1px solid var(--tw-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
  color: var(--tw-text);
  font: inherit;
}

.filter-input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.loading, .error-message {
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

.error-message {
  margin-top: 14px;
  padding: 12px;
  background-color: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  font-size: 0.95rem;
  border-left: 4px solid #dc2626;
}

.users-table-container {
  background: var(--tw-surface);
  border-radius: var(--tw-radius-lg);
  border: 1px solid var(--tw-border);
  box-shadow: var(--tw-shadow-sm);
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.users-table th {
  background: var(--tw-bg);
  font-weight: 600;
  color: #111827;
}

.users-table tbody tr:hover {
  background: rgba(99, 102, 241, 0.04);
}

.info-link {
  color: #2563eb;
  font-weight: 650;
  text-decoration: none;
}

.info-link:hover {
  text-decoration: underline;
}

.muted-text {
  color: #94a3b8;
  font-weight: 650;
}

.warning-text {
  display: inline-flex;
  align-items: center;
  border: 1px solid #fdba74;
  border-radius: 999px;
  padding: 5px 9px;
  background: #ffedd5;
  color: #9a3412;
  font-size: 0.78rem;
  font-weight: 800;
}

.actions {
  display: flex;
  gap: 8px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: var(--tw-surface);
  padding: 30px;
  border-radius: var(--tw-radius-lg);
  border: 1px solid var(--tw-border);
  box-shadow: var(--tw-shadow-lg);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--tw-border);
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.site-footer { background: #fff; border-top: 1px solid var(--tw-border); padding: 14px 16px; text-align: center; color: #6b7280; font-size: 0.9rem; }
</style>
