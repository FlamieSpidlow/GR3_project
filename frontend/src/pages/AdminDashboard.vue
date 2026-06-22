<template>
  <div class="admin-dashboard">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Quản trị hệ thống</h1>
          <p>Quản lý người dùng và địa điểm trong hệ thống</p>
        </div>
      </section>

      <div class="tw-container-wide page-body">
        <div class="admin-info tw-surface">
          <p><strong>Xin chào, Admin {{ username }}!</strong></p>
          <p>Chọn chức năng quản lý bên dưới:</p>
        </div>

        <div class="admin-cards">
          <router-link to="/admin/users" class="admin-card tw-surface">
            <div class="card-icon">👥</div>
            <h2>Quản lý người dùng</h2>
            <p>Xem, thêm, sửa, xóa người dùng</p>
          </router-link>

          <router-link to="/admin/places" class="admin-card tw-surface">
            <div class="card-icon">📍</div>
            <h2>Quản lý địa điểm</h2>
            <p>Xem, thêm, sửa, xóa địa điểm</p>
          </router-link>

          <router-link to="/admin/activities" class="admin-card tw-surface">
            <div class="card-icon">A</div>
            <h2>Quản lý hoạt động</h2>
            <p>Thêm, sửa, xóa các hoạt động vui chơi trên trang chủ</p>
          </router-link>

          <router-link to="/admin/tickets" class="admin-card tw-surface">
            <div class="card-icon">T</div>
            <h2>Quản lý vé</h2>
            <p>Xác nhận, hủy và đánh dấu vé đã sử dụng</p>
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { getAuthUser } from '../utils/authSession'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      username: ''
    }
  },
  mounted() {
    // Kiểm tra quyền admin
    const user = getAuthUser() || {}
    if (user.role !== 'admin') {
      this.$notify({ type: 'error', title: 'Không có quyền truy cập', message: 'Bạn cần tài khoản quản trị để mở trang này.' })
      this.$router.push('/')
      return
    }
    this.username = user.username || 'Admin'
  }
}
</script>

<style scoped>
.admin-dashboard {
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

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 600; line-height: 1.5; }

.page-body { padding-top: 26px; padding-bottom: 46px; }

.admin-info {
  padding: 18px;
  text-align: center;
  margin: 0 auto 26px auto;
  max-width: 900px;
}

.admin-info p {
  margin: 8px 0;
  color: #555;
  font-size: 16px;
}

.admin-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;
}

.admin-card {
  padding: 28px 24px;
  text-decoration: none;
  color: inherit;
  text-align: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
}

.admin-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--tw-shadow-md);
}

.card-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.admin-card h2 {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 10px;
}

.admin-card p {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.site-footer { background: #fff; border-top: 1px solid var(--tw-border); padding: 14px 16px; text-align: center; color: #6b7280; font-size: 0.9rem; }
</style>
