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
            <button @click="showAddModal = true" class="tw-btn tw-btn-primary">+ Thêm người dùng</button>
          </div>
        </div>

        <div v-if="isLoading" class="loading">Đang tải...</div>
        <div v-else-if="errorMessage" class="error-message">{{ errorMessage }}</div>

        <div v-else class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Họ tên phụ huynh</th>
                <th>Địa chỉ</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user._id">
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.parentName }}</td>
                <td>{{ user.address }}</td>
                <td><span :class="['role-badge', user.role]">{{ user.role }}</span></td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td class="actions">
                  <button @click="editUser(user)" class="btn-icon btn-edit" title="Sửa">✏️</button>
                  <button @click="confirmDelete(user)" class="btn-icon btn-delete" title="Xóa">🗑️</button>
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

export default {
  name: 'AdminUsers',
  data() {
    return {
      users: [],
      isLoading: false,
      errorMessage: '',
      showAddModal: false,
      showEditModal: false,
      formData: {
        username: '',
        email: '',
        password: '',
        parentName: '',
        address: ''
      },
      editingUserId: null
    }
  },
  mounted() {
    this.checkAdmin()
    this.loadUsers()
  },
  methods: {
    checkAdmin() {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang này')
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
        alert('Thêm người dùng thành công!')
        this.closeModals()
        this.loadUsers()
      } else {
        alert('Lỗi: ' + res.error)
      }
    },
    editUser(user) {
      this.editingUserId = user._id
      this.formData = {
        username: user.username,
        email: user.email,
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
        alert('Cập nhật người dùng thành công!')
        this.closeModals()
        this.loadUsers()
      } else {
        alert('Lỗi: ' + res.error)
      }
    },
    confirmDelete(user) {
      if (confirm(`Bạn có chắc muốn xóa người dùng "${user.username}"?`)) {
        this.deleteUserById(user._id)
      }
    },
    async deleteUserById(id) {
      const res = await deleteUser(id)
      if (res.success) {
        alert('Xóa người dùng thành công!')
        this.loadUsers()
      } else {
        alert('Lỗi: ' + res.error)
      }
    },
    closeModals() {
      this.showAddModal = false
      this.showEditModal = false
      this.formData = {
        username: '',
        email: '',
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
  gap: 10px;
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

.role-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.role-badge.admin {
  background: #ff9800;
  color: white;
}

.role-badge.user {
  background: #2196F3;
  color: white;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  transition: transform 0.2s;
}

.btn-icon:hover {
  transform: scale(1.2);
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
