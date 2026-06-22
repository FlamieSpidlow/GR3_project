<template>
  <div class="nav-shell">
    <nav class="navbar">
      <div class="navbar-inner">
        <div class="brand-area">
          <router-link to="/" class="brand" aria-label="TheWeekend">
            <img src="/Logo.jpg" alt="TheWeekend" class="brand-logo" />
          </router-link>
          <router-link v-if="!isAdmin" to="/about" class="about-link">Về chúng tôi</router-link>
        </div>

        <div class="nav-area">
          <ul v-if="!isAdmin" class="nav-links">
            <li><router-link to="/">Trang chủ</router-link></li>
            <li><router-link to="/suggest">Gợi ý</router-link></li>
            <li><router-link to="/favour">Yêu thích</router-link></li>
            <li><router-link to="/tickets">Vé của tôi</router-link></li>
          </ul>
          <ul v-else class="nav-links">
            <li><router-link to="/admin">Quản trị hệ thống</router-link></li>
          </ul>
        </div>

        <div class="user-actions">
          <button
            type="button"
            class="icon-btn"
            @click="openSearchPopup"
            aria-label="Tìm kiếm"
            title="Tìm kiếm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <div class="notification-menu">
            <button
              type="button"
              class="icon-btn notification-btn"
              @click.stop="toggleNotifications"
              aria-label="Thông báo"
              title="Thông báo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span v-if="unreadNotificationCount > 0" class="notification-dot">{{ unreadNotificationCount > 9 ? '9+' : unreadNotificationCount }}</span>
            </button>
            <div v-if="showNotifications" class="notification-panel" @click.stop>
              <div class="notification-header">
                <strong>Thông báo</strong>
                <button v-if="notifications.length > 0" type="button" class="link-btn" @click="clearNotificationList">Xóa tất cả</button>
              </div>
              <div v-if="notifications.length === 0" class="notification-empty">Chưa có thông báo mới</div>
              <div v-else class="notification-list">
                <div
                  v-for="item in notifications"
                  :key="item.id"
                  :class="['notification-item', item.type, { unread: !item.read }]"
                >
                  <div class="notification-item-title">{{ item.title || notificationTypeLabel(item.type) }}</div>
                  <div class="notification-item-message">{{ item.message }}</div>
                  <div class="notification-item-time">{{ formatNotificationTime(item.createdAt) }}</div>
                </div>
              </div>
            </div>
          </div>

          <template v-if="isAuthenticated">
            <div class="user-info">
              <div class="user-details">
                <p class="parent-name">{{ user.parentName }}</p>
                <p class="email">{{ user.email }}</p>
              </div>
            </div>
            <div class="user-menu">
              <button @click="toggleMenu" class="user-icon-btn" aria-label="Mở menu người dùng">
                <img
                  v-if="user.avatar"
                  :src="user.avatar"
                  alt="Avatar"
                  class="avatar-img"
                />
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
                </svg>
              </button>
              <div v-if="showMenu" class="dropdown-menu">
                <button v-if="isAdmin" @click="goToAdmin" class="menu-item admin">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                  Quản trị hệ thống
                </button>
                <button v-if="!isAdmin" @click="editProfile" class="menu-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Chỉnh sửa thông tin
                </button>
                <button v-if="!isAdmin" @click="changePassword" class="menu-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
                    <path d="M20 12v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5"></path>
                    <path d="M16 6V5a4 4 0 0 0-8 0v1"></path>
                  </svg>
                  Đổi mật khẩu
                </button>
                <button v-if="!isAdmin" @click="goToTickets" class="menu-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M4 5a2 2 0 0 1 2-2h12v18l-3-2-3 2-3-2-3 2V5z"></path>
                    <path d="M8 7h8"></path>
                    <path d="M8 11h8"></path>
                  </svg>
                  Vé của tôi
                </button>
                <button @click="logout" class="menu-item logout">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4"></path>
                    <polyline points="17 16 21 12 17 8"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Đăng xuất
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <button class="tw-btn tw-btn-primary login-btn" @click="goToLogin">Đăng nhập</button>
          </template>
        </div>
      </div>
    </nav>

    <div v-if="showSearchPopup" class="search-modal">
      <div class="search-backdrop" @click="closeSearchPopup"></div>
      <div class="search-dialog" role="dialog" aria-modal="true">
        <div class="search-header">
          <h3 class="search-title">Tìm kiếm</h3>
          <button type="button" class="close-btn" @click="closeSearchPopup">Đóng</button>
        </div>

        <div class="search-body">
          <div class="search-input-row">
            <input
              ref="searchInput"
              type="text"
              v-model="searchQuery"
              placeholder="VD: công viên, khu vui chơi trong nhà, miễn phí..."
              @keyup.enter="submitSearch"
            />
            <button type="button" class="tw-btn tw-btn-primary" @click="submitSearch">
              Tìm kiếm
            </button>
          </div>

          <div v-if="searchError" class="search-error">{{ searchError }}</div>

          <div class="search-age">
            <label>Độ tuổi phù hợp: <strong>{{ searchAge }}</strong></label>
            <input type="range" min="1" max="12" v-model="searchAge" />
          </div>

          <div class="search-grid">
            <div class="search-block">
              <div class="block-header">
                <span class="block-title">Lịch sử tìm kiếm</span>
                <button
                  v-if="isAuthenticated && !isLoadingSearchHistory && searchHistory.length > 0"
                  type="button"
                  class="link-btn"
                  @click="clearHistory"
                >
                  Xóa tất cả
                </button>
              </div>

              <div v-if="!isAuthenticated" class="block-empty tw-muted">Chưa có lịch sử tìm kiếm</div>
              <div v-else-if="isLoadingSearchHistory" class="block-empty tw-muted">Đang tải...</div>
              <div v-else-if="searchHistory.length === 0" class="block-empty tw-muted">Chưa có lịch sử tìm kiếm</div>
              <div v-else class="history-list">
                <button
                  v-for="(item, idx) in searchHistory.slice(0, 6)"
                  :key="idx"
                  type="button"
                  class="history-item"
                  @click="selectHistory(item.query)"
                >
                  {{ item.query }}
                </button>
              </div>
            </div>

            <div class="search-block">
              <div class="block-header">
                <span class="block-title">Từ khóa phổ biến</span>
              </div>
              <div class="chips">
                <button
                  v-for="kw in popularKeywords"
                  :key="kw"
                  type="button"
                  class="chip"
                  @click="selectPopular(kw)"
                >
                  {{ kw }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="confirmDialog" class="app-dialog-layer">
      <div class="app-dialog-backdrop" @click="resolveConfirm(false)"></div>
      <div class="app-dialog" role="dialog" aria-modal="true">
        <h3>{{ confirmDialog.title }}</h3>
        <p>{{ confirmDialog.message }}</p>
        <div class="app-dialog-actions">
          <button type="button" class="tw-btn tw-btn-outline" @click="resolveConfirm(false)">{{ confirmDialog.cancelText }}</button>
          <button type="button" :class="['tw-btn', confirmDialog.tone === 'danger' ? 'dialog-danger' : 'tw-btn-primary']" @click="resolveConfirm(true)">
            {{ confirmDialog.confirmText }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="promptDialog" class="app-dialog-layer">
      <div class="app-dialog-backdrop" @click="resolvePromptValue(true)"></div>
      <div class="app-dialog" role="dialog" aria-modal="true">
        <h3>{{ promptDialog.title }}</h3>
        <p v-if="promptDialog.message">{{ promptDialog.message }}</p>
        <textarea
          v-model="promptDialog.value"
          class="prompt-input"
          :placeholder="promptDialog.placeholder"
          rows="4"
        ></textarea>
        <div class="app-dialog-actions">
          <button type="button" class="tw-btn tw-btn-outline" @click="resolvePromptValue(true)">{{ promptDialog.cancelText }}</button>
          <button type="button" class="tw-btn tw-btn-primary" @click="resolvePromptValue(false)">{{ promptDialog.confirmText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { clearProfileCache, clearSearchHistory, getProfile, saveSearchHistory } from '../api/auth'
import { clearAuthSession, getAuthToken, getAuthUserRaw } from '../utils/authSession'
import {
  clearNotifications,
  loadNotifications,
  markAllNotificationsRead,
  notificationState,
  resolveConfirmation,
  resolvePrompt
} from '../utils/notifications'

export default {
  name: 'NavBar',
  data() {
    return {
      user: {},
      isAuthenticated: false,
      showMenu: false,
      isAdmin: false,

      showSearchPopup: false,
      searchQuery: '',
      searchAge: 3,
      searchHistory: [],
      searchError: '',
      isLoadingSearchHistory: false,
      showNotifications: false
    }
  },
  computed: {
    popularKeywords() {
      return ['công viên', 'khu vui chơi trong nhà', 'miễn phí', 'cuối tuần', 'bơi lội', 'picnic']
    },
    notifications() {
      return notificationState.items
    },
    unreadNotificationCount() {
      return notificationState.items.filter(item => !item.read).length
    },
    confirmDialog() {
      return notificationState.confirm
    },
    promptDialog() {
      return notificationState.prompt
    }
  },
  mounted() {
    this.checkAuth()
    if (this.isAuthenticated) loadNotifications()
    document.addEventListener('click', this.closeMenu)
  },
  watch: {
    $route() {
      this.checkAuth()
      this.showMenu = false
      this.showNotifications = false
      if (this.isAuthenticated) {
        loadNotifications()
      } else {
        clearNotifications({ remote: false })
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeMenu)
  },
  methods: {
    checkAuth() {
      const authToken = getAuthToken()
      const userData = getAuthUserRaw()
      
      if (authToken && userData) {
        this.isAuthenticated = true
        this.user = JSON.parse(userData)
        this.isAdmin = this.user.role === 'admin'
      } else {
        this.isAuthenticated = false
        this.isAdmin = false
      }
    },
    goToLogin() {
      this.$router.push('/login')
    },
    openSearchPopup() {
      this.showMenu = false
      this.showNotifications = false
      this.showSearchPopup = true
      this.searchError = ''
      this.loadSearchHistory()
      this.$nextTick(() => {
        const el = this.$refs.searchInput
        if (el && typeof el.focus === 'function') {
          el.focus()
        }
      })
    },
    closeSearchPopup() {
      this.showSearchPopup = false
      this.searchError = ''
    },
    toggleNotifications() {
      this.showMenu = false
      this.showSearchPopup = false
      this.showNotifications = !this.showNotifications
      if (this.showNotifications) {
        loadNotifications().finally(() => markAllNotificationsRead())
      }
    },
    clearNotificationList() {
      clearNotifications()
      this.showNotifications = false
    },
    notificationTypeLabel(type) {
      if (type === 'success') return 'Thành công'
      if (type === 'error') return 'Cảnh báo'
      if (type === 'warning') return 'Lưu ý'
      return 'Thông báo'
    },
    formatNotificationTime(value) {
      if (!value) return ''
      return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    },
    resolveConfirm(value) {
      resolveConfirmation(value)
    },
    resolvePromptValue(cancelled) {
      resolvePrompt(this.promptDialog ? this.promptDialog.value : '', cancelled)
    },
    async loadSearchHistory() {
      const token = getAuthToken()
      if (!token) {
        this.searchHistory = []
        this.isLoadingSearchHistory = false
        return
      }

      this.isLoadingSearchHistory = true
      try {
        const res = await getProfile()
        if (res && res.success && res.user && Array.isArray(res.user.searchHistory)) {
          this.searchHistory = res.user.searchHistory
        } else {
          this.searchHistory = []
        }
      } catch (e) {
        console.warn('Failed to load search history:', e)
        this.searchHistory = []
      } finally {
        this.isLoadingSearchHistory = false
      }
    },
    selectHistory(query) {
      this.searchQuery = query
      this.submitSearch()
    },
    selectPopular(keyword) {
      this.searchQuery = keyword
      this.submitSearch()
    },
    async clearHistory() {
      try {
        await clearSearchHistory()
        this.searchHistory = []
      } catch (e) {
        console.warn('Failed to clear search history:', e)
      }
    },
    async submitSearch() {
      this.searchError = ''
      if (!this.searchQuery || !this.searchQuery.trim()) {
        this.searchError = 'Vui lòng nhập từ khóa tìm kiếm'
        return
      }

      const q = this.searchQuery.trim()
      if (this.isAuthenticated) {
        try {
          const res = await saveSearchHistory(q)
          if (res && res.success && Array.isArray(res.searchHistory)) {
            this.searchHistory = res.searchHistory
          } else if (res && res.status === 401) {
            clearAuthSession()
            this.checkAuth()
          }
        } catch (e) {
          console.warn('Failed to save search history:', e)
        }
      }
      this.showSearchPopup = false
      this.$router.push({
        path: '/search',
        query: { q, age: String(this.searchAge) }
      })
    },
    toggleMenu() {
      this.showNotifications = false
      this.showMenu = !this.showMenu
    },
    closeMenu(event) {
      const userMenu = this.$el.querySelector('.user-menu')
      if (userMenu && !userMenu.contains(event.target)) {
        this.showMenu = false
      }
      const notificationMenu = this.$el.querySelector('.notification-menu')
      if (notificationMenu && !notificationMenu.contains(event.target)) {
        this.showNotifications = false
      }
    },
    editProfile() {
      this.showMenu = false
      this.$router.push('/profile/edit')
    },
    changePassword() {
      this.showMenu = false
      this.$router.push('/profile/change-password')
    },
    goToTickets() {
      this.showMenu = false
      this.$router.push('/tickets')
    },
    goToAdmin() {
      this.showMenu = false
      this.$router.push('/admin')
    },
    logout() {
      clearAuthSession()
      clearProfileCache()
      clearNotifications({ remote: false })
      this.isAuthenticated = false
      this.showMenu = false
      
      this.$notify({
        title: 'Đã đăng xuất',
        message: 'Bạn đã đăng xuất thành công',
        type: 'info',
        duration: 2000
      })
      
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--tw-border);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.navbar-inner {
  max-width: var(--tw-container-wide);
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-area {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto;
}

.brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  flex: 0 0 auto;
}

.about-link {
  text-decoration: none;
  color: var(--tw-muted);
  font-weight: 650;
  font-size: 0.95rem;
  padding: 8px 10px;
  border-radius: 999px;
  transition: background-color 0.12s ease, color 0.12s ease;
  white-space: nowrap;
}

.about-link:hover {
  background: var(--tw-bg);
  color: var(--tw-text);
}

.about-link.router-link-active,
.about-link.router-link-exact-active {
  color: var(--tw-primary);
}

.brand-logo {
  height: 40px;
  width: auto;
  display: block;
}

.nav-area {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  min-width: 0;
}

.nav-links {
  display: flex;
  gap: 28px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-links li a {
  text-decoration: none;
  color: var(--tw-muted);
  font-weight: 650;
  font-size: 0.95rem;
  transition: color 0.18s ease;
}

.nav-links li a:hover {
  color: var(--tw-text);
}

.nav-links li a.router-link-active,
.nav-links li a.router-link-exact-active {
  color: var(--tw-primary);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.nav-shell {
  position: relative;
}

.icon-btn {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid var(--tw-border);
  background: var(--tw-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tw-muted);
  transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.icon-btn:hover {
  background: var(--tw-bg);
  color: var(--tw-text);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
  display: block;
}

.notification-menu {
  position: relative;
}

.notification-btn {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #dc2626;
  color: #ffffff;
  border: 2px solid #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  line-height: 1;
  font-weight: 900;
}

.notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(360px, calc(100vw - 24px));
  max-height: min(480px, calc(100vh - 110px));
  overflow: hidden;
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  border-radius: 14px;
  box-shadow: var(--tw-shadow-md);
  z-index: 2200;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 14px;
  border-bottom: 1px solid var(--tw-border);
}

.notification-empty {
  padding: 22px 14px;
  color: var(--tw-muted);
  text-align: center;
  font-weight: 700;
}

.notification-list {
  max-height: 410px;
  overflow-y: auto;
  padding: 8px;
}

.notification-item {
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: #ffffff;
}

.notification-item + .notification-item {
  margin-top: 8px;
}

.notification-item.unread {
  border-color: rgba(79, 70, 229, 0.22);
  background: #eef2ff;
}

.notification-item.success { border-left: 4px solid #059669; }
.notification-item.error { border-left: 4px solid #dc2626; }
.notification-item.warning { border-left: 4px solid #d97706; }
.notification-item.info { border-left: 4px solid #2563eb; }

.notification-item-title {
  color: var(--tw-text);
  font-weight: 900;
  font-size: 0.92rem;
}

.notification-item-message {
  margin-top: 4px;
  color: var(--tw-muted);
  font-size: 0.88rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.notification-item-time {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 0.76rem;
  font-weight: 800;
}

.app-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.app-dialog-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.58);
}

.app-dialog {
  position: relative;
  width: min(440px, 100%);
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  border-radius: 14px;
  box-shadow: var(--tw-shadow-md);
  padding: 18px;
}

.app-dialog h3 {
  margin: 0 0 8px;
  color: var(--tw-text);
  font-size: 1.08rem;
  font-weight: 900;
}

.app-dialog p {
  margin: 0 0 16px;
  color: var(--tw-muted);
  line-height: 1.5;
}

.app-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.dialog-danger {
  background: #dc2626;
  color: #ffffff;
  border: 1px solid #dc2626;
}

.dialog-danger:hover {
  background: #b91c1c;
}

.prompt-input {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--tw-border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--tw-text);
  font: inherit;
}

.prompt-input:focus {
  outline: none;
  border-color: var(--tw-primary);
}

@media (max-width: 900px) {
  .nav-links { gap: 14px; font-size: 0.92rem }
  .navbar-inner { padding-left: 16px; padding-right: 16px }
}

@media (max-width: 640px) {
  .nav-links { gap: 10px; font-size: 0.88rem }
  .user-details { display: none }
  .brand-logo { height: 34px }
  .navbar-inner { gap: 10px }
}

.login-btn {
  padding: 10px 14px;
  border-radius: 999px;
}

.logout-btn {
  padding: 8px 16px;
  background: #ef4444;
  font-size: 0.85rem;
}

.logout-btn:hover {
  background: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-details { text-align: left }
.user-details .parent-name { margin: 0; font-weight: 700; color: var(--tw-text); font-size: 0.95rem; line-height: 1.25 }
.user-details .email { margin: 0; color: var(--tw-muted); font-size: 0.84rem; line-height: 1.25 }

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: var(--tw-text);
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.12s ease, color 0.12s ease;
}
.menu-item svg { stroke-width: 2 }
.menu-item:hover { background-color: #f8fafc; color: var(--tw-text) }

.menu-item.admin {
  color: #ff9800;
  font-weight: 600;
}

.menu-item.admin:hover {
  background-color: #fff3e0;
  color: #f57c00;
}

.user-menu {
  position: relative;
}

.user-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  color: var(--tw-primary);
}

.user-icon-btn:hover {
  background-color: rgba(99, 102, 241, 0.08);
  color: var(--tw-primary-600);
}

.user-icon-btn svg {
  width: 24px;
  height: 24px;
}

.avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid transparent;
  transition: border-color 0.3s ease;
}

.user-icon-btn:hover .avatar-img {
  border-color: #a78bfa;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 200px;
  z-index: 1000;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--tw-border);
}

.search-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 80px 16px 24px 16px;
}

.search-backdrop {
  position: absolute;
  inset: 0;
  background: var(--tw-text);
  opacity: 0.55;
}

.search-dialog {
  position: relative;
  width: 100%;
  max-width: 760px;
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-lg);
  box-shadow: var(--tw-shadow-md);
  overflow: hidden;
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--tw-border);
}

.search-title {
  margin: 0;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0;
}

.close-btn {
  border: 1px solid var(--tw-border);
  background: var(--tw-surface);
  color: var(--tw-muted);
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 900;
}

.close-btn:hover {
  background: var(--tw-bg);
  color: var(--tw-text);
}

.search-body {
  padding: 16px;
}

.search-input-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.search-input-row input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--tw-border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 1rem;
  background: var(--tw-surface);
  color: var(--tw-text);
}

.search-input-row input:focus {
  outline: none;
  border-color: var(--tw-primary);
}

.search-error {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--tw-border);
  background: var(--tw-bg);
  color: var(--tw-danger-700);
  font-weight: 800;
  font-size: 0.92rem;
}

.search-age {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.search-age label {
  font-weight: 800;
  color: var(--tw-text);
}

.search-age input[type="range"] {
  flex: 1 1 420px;
  min-width: 320px;
  max-width: 560px;
  width: 100%;
  accent-color: var(--tw-primary);
}

.search-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.search-block {
  border: 1px solid var(--tw-border);
  border-radius: 14px;
  background: var(--tw-surface);
  padding: 12px;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.block-title {
  font-weight: 900;
  color: var(--tw-text);
}

.link-btn {
  border: none;
  background: transparent;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--tw-primary);
  font-weight: 900;
}

.link-btn:hover {
  background: var(--tw-bg);
}

.block-empty {
  padding: 10px 6px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  border: 1px solid var(--tw-border);
  background: var(--tw-surface);
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--tw-text);
  font-weight: 800;
}

.history-item:hover {
  background: var(--tw-bg);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid var(--tw-border);
  background: var(--tw-surface);
  padding: 8px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  color: var(--tw-text);
  font-size: 0.9rem;
}

.chip:hover {
  background: var(--tw-bg);
}

@media (max-width: 720px) {
  .search-modal {
    padding-top: 70px;
  }
  .search-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .navbar-inner {
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 10px;
    padding: 10px 12px;
  }

  .brand-area {
    flex: 1 1 auto;
    min-width: 0;
  }

  .about-link {
    display: none;
  }

  .nav-area {
    order: 3;
    flex: 1 0 100%;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .nav-area::-webkit-scrollbar {
    display: none;
  }

  .nav-links {
    width: max-content;
    min-width: 100%;
    gap: 6px;
    justify-content: flex-start;
  }

  .nav-links li a {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 8px 10px;
    border-radius: 999px;
    background: #f8fafc;
    white-space: nowrap;
    font-size: 0.88rem;
  }

  .user-actions {
    flex: 0 0 auto;
    gap: 6px;
  }

  .icon-btn {
    width: 38px;
    height: 38px;
  }

  .login-btn {
    padding: 9px 12px;
    white-space: nowrap;
  }

  .dropdown-menu {
    right: 0;
    min-width: 190px;
  }

  .search-modal {
    align-items: stretch;
    padding: 66px 10px 12px;
  }

  .search-dialog {
    max-height: calc(100vh - 82px);
    overflow-y: auto;
  }

  .search-input-row {
    flex-direction: column;
  }

  .search-input-row .tw-btn {
    width: 100%;
  }

  .search-age input[type="range"] {
    flex-basis: auto;
    min-width: 0;
  }
}

</style>
