<template>
  <div class="recommendations-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Gợi ý cho bạn</h1>
          <p>Dựa trên vị trí hiện tại để đề xuất địa điểm phù hợp</p>
        </div>
      </section>

      <div class="tw-container-wide page-body">
      <div class="user-card tw-surface">
        <div class="avatar">
          <img v-if="user.avatar" :src="user.avatar" alt="avatar" class="avatar-img" />
          <div v-else class="avatar-fallback">{{ userInitials }}</div>
        </div>
        <div class="user-info">
          <div class="user-heading">
            <h2>{{ user.name }}</h2>
            <p class="email" v-if="user.email">{{ user.email }}</p>
          </div>
          <div class="profile-row">
            <span class="profile-icon" aria-label="Địa chỉ" title="Địa chỉ">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </span>
            <span class="profile-value">{{ user.address || 'Chưa đặt địa chỉ' }}</span>
          </div>
        </div>
      </div>

      <div class="location-found-banner" v-if="nearbyCount > 0">
        <span class="status-dot"></span>
        <p>Đã tìm thấy các địa điểm vui chơi gần bạn. Hiện tại có <strong>{{ nearbyCount }}</strong> địa điểm đang hoạt động!</p>
      </div>

      <div class="location-warning" v-if="isLocating && !userLocation">
        <span class="status-dot warning"></span>
        <p>Đang lấy vị trí của bạn...</p>
      </div>

      <div class="location-warning" v-else-if="!userLocation">
        <span class="status-dot warning"></span>
        <p>Chưa lấy được vị trí của bạn nên <strong>không hiển thị khoảng cách</strong>. Hãy bật quyền định vị cho trình duyệt (hoặc chạy bằng <strong>https/localhost</strong>).</p>
      </div>

      <h2 class="section-title">Gợi ý cho bạn</h2>

      <div v-if="loading" class="loading">Đang tải...</div>
      <div v-else>
        <div v-if="recommendations.length === 0">
          <div class="empty">Không có gợi ý</div>
        </div>
        <div class="grid">
          <PlaceCard
            v-for="place in displayed"
            :key="place.id"
            :place="place"
            :showTags="false"
            @select="viewDetails"
            @favorite-toggle="onFavoriteToggle"
          />
        </div>

        <div v-if="hasMore" class="more">
          <button class="btn-outline" @click="loadMore">Xem thêm ({{ recommendations.length - displayLimit }})</button>
        </div>
      </div>
      </div>
    </main>
  </div>
</template>

<script>
import PlaceCard from '../components/PlaceCard.vue'
import { getAllPlaces } from '../api/places'
import { getProfile, updateLocation } from '../api/auth'
import { getAuthToken, getAuthUserRaw } from '../utils/authSession'

export default {
  name: 'SuggestPage',
  components: { PlaceCard },
  data() {
    return {
      user: {
        name: 'Người dùng',
        numberOfKids: 1,
        address: '',
        email: '',
        avatar: '',
        lat: null,
        lng: null
      },
      loading: true,
      recommendations: [],
      displayLimit: 6,
      userLocation: null,
      isLocating: false,
      favorites: []
    }
  },
  computed: {
    userInitials() {
      return String(this.user.name || 'U').trim().slice(0, 1).toUpperCase()
    },
    displayed() {
      return this.recommendations.slice(0, this.displayLimit)
    },
    hasMore() {
      return this.recommendations.length > this.displayLimit
    },
    nearbyCount() {
      return this.recommendations.length
    }
  },
  mounted() {
    this.loadFavorites()
    this.loadUserProfile()
  },
  methods: {
    coerceNumber(v) {
      if (v === null || v === undefined || v === '') return null
      const n = typeof v === 'number' ? v : parseFloat(v)
      return Number.isFinite(n) ? n : null
    },
    setUserLocation(lat, lng, { persist = true } = {}) {
      const latNum = this.coerceNumber(lat)
      const lngNum = this.coerceNumber(lng)
      if (latNum === null || lngNum === null) return false
      this.userLocation = { lat: latNum, lng: lngNum }
      if (persist) {
        localStorage.setItem('userLocation', JSON.stringify(this.userLocation))
      }
      return true
    },
    setUserAddress(address, { persist = true } = {}) {
      const value = String(address || '').trim()
      if (!value) return false
      this.user.address = value
      if (persist) {
        localStorage.setItem('userAddress', value)
      }
      return true
    },
    loadUserAddressFromStorage() {
      const address = localStorage.getItem('userAddress')
      if (address) this.setUserAddress(address, { persist: false })
    },
    loadUserLocationFromStorage() {
      try {
        const raw = localStorage.getItem('userLocation')
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed && parsed.lat != null && parsed.lng != null) {
          this.setUserLocation(parsed.lat, parsed.lng, { persist: false })
        }
      } catch {
        // ignore
      }
    },
    async loadUserProfile() {
      this.loadUserLocationFromStorage()
      let loadedFromProfile = false
      const token = getAuthToken()
      if (token) {
        try {
          // Fetch from server to get latest user data
          const res = await getProfile()
          if (res.success && res.user) {
            const u = res.user
            this.user.name = u.parentName || u.username || this.user.name
            this.user.email = u.email || ''
            this.user.avatar = u.avatar || ''
            this.user.numberOfKids = u.numberOfKids || 1
            this.setUserAddress(u.address, { persist: true })
            loadedFromProfile = true
            this.user.lat = u.lat
            this.user.lng = u.lng
            if (u.lat != null && u.lng != null) {
              this.setUserLocation(u.lat, u.lng)
            }
          }
        } catch (e) {
          console.warn('Failed to fetch profile:', e)
        }
      }
      
      // Fallback to localStorage only when profile is unavailable.
      if (!loadedFromProfile) {
        this.loadUserAddressFromStorage()
        this.loadUserFromStorage()
      }
      this.getUserLocationAndFetch()
    },
    loadUserFromStorage() {
      try {
        const authToken = getAuthToken()
        const raw = getAuthUserRaw() || localStorage.getItem('profile') || null
        if (authToken && raw) {
          const parsed = JSON.parse(raw)
          const src = parsed && parsed.user && typeof parsed.user === 'object' ? parsed.user : parsed

          this.user.name = src.parentName || src.name || src.fullName || src.displayName || src.username || this.user.name
          this.user.email = src.email || src.mail || ''
          this.user.avatar = src.avatar || src.photoURL || src.image || ''
          this.user.numberOfKids = src.numberOfKids || src.kids || this.user.numberOfKids
          this.setUserAddress(src.address || src.locationAddress || src.formattedAddress, { persist: true })
          const lat = src.lat ?? src.latitude ?? (src.location && src.location.lat)
          const lng = src.lng ?? src.longitude ?? (src.location && src.location.lng)
          if (lat != null && lng != null) {
            this.user.lat = lat
            this.user.lng = lng
            this.setUserLocation(lat, lng)
          }
        } else if (raw) {
          // fallback if no authToken but profile stored
          const parsed = JSON.parse(raw)
          const src = parsed && parsed.user && typeof parsed.user === 'object' ? parsed.user : parsed
          this.user.name = src.name || src.parentName || this.user.name
          this.user.email = src.email || ''
          this.user.avatar = src.avatar || ''
          this.setUserAddress(src.address || src.locationAddress || src.formattedAddress, { persist: true })
          if (src.lat != null && src.lng != null) {
            this.user.lat = src.lat
            this.user.lng = src.lng
            this.setUserLocation(src.lat, src.lng)
          }
        }
      } catch (e) {
        console.warn('Failed to load user from localStorage (SuggestPage)', e)
      }
    },
    async getUserLocationAndFetch() {
      if ('geolocation' in navigator) {
        this.isLocating = true
        navigator.geolocation.getCurrentPosition(async (pos) => {
          this.setUserLocation(pos.coords.latitude, pos.coords.longitude)

          // Keep recommendation distance fresh, but do not overwrite the profile address badge.
          try {
            const token = getAuthToken()
            if (token) {
              await updateLocation({
                lat: this.userLocation.lat,
                lng: this.userLocation.lng
              })
            }
          } catch (e) {
            console.warn('Failed to persist user location:', e)
          }

          this.isLocating = false
          await this.fetchRecommendations()
        }, async () => {
          this.isLocating = false
          await this.fetchRecommendations()
        }, { timeout: 5000 })
      } else {
        await this.fetchRecommendations()
      }
    },
    async fetchRecommendations() {
      this.loading = true
      try {
        // Lấy tất cả địa điểm từ database
        const res = await getAllPlaces()
        
        if (res && res.success && res.data) {
          // Map và tính khoảng cách
          let places = res.data.map((p, idx) => {
            let distance = null
            const pLat = this.coerceNumber(p.lat)
            const pLng = this.coerceNumber(p.lng)
            if (this.userLocation && pLat != null && pLng != null) {
              distance = this.calculateDistance(
                this.userLocation.lat, 
                this.userLocation.lng, 
                pLat,
                pLng
              )
            }
            return {
              id: p.id || idx,
              name: p.name,
              address: p.address || p.description || '',
              description: p.description || p.address || '',
              image: p.image || null,
              images: p.images || [],
              averageRating: p.rating || null,
              ageRange: p.ageRange || '0-12',
              price: p.price || 'Miễn phí',
              lat: pLat,
              lng: pLng,
              distance: distance
            }
          })

          // Chỉ lấy địa điểm trong bán kính 10km nếu có vị trí người dùng
          if (this.userLocation) {
            places = places.filter(p => p.distance !== null && p.distance <= 10000)
          }

          // Sắp xếp theo khoảng cách từ gần đến xa
          places.sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0
            if (a.distance === null) return 1
            if (b.distance === null) return -1
            return a.distance - b.distance
          })

          this.recommendations = places
        } else {
          this.recommendations = []
        }
      } catch (err) {
        console.error(err)
        this.recommendations = []
      }
      this.loading = false
    },
    calculateDistance(lat1, lng1, lat2, lng2) {
      const aLat = this.coerceNumber(lat1)
      const aLng = this.coerceNumber(lng1)
      const bLat = this.coerceNumber(lat2)
      const bLng = this.coerceNumber(lng2)
      if (aLat === null || aLng === null || bLat === null || bLng === null) return null
      const toRad = (v) => (v * Math.PI) / 180
      const R = 6371000 // Earth radius in meters
      const dLat = toRad(bLat - aLat)
      const dLng = toRad(bLng - aLng)
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c // distance in meters
    },

    loadFavorites() {
      try {
        this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
      } catch (e) {
        this.favorites = []
      }
    },
    saveFavorites() {
      localStorage.setItem('favorites', JSON.stringify(this.favorites))
    },
    onFavoriteToggle({ id, favorited }) {
      if (favorited) {
        if (!this.favorites.includes(id)) {
          this.favorites.push(id)
        }
      } else {
        this.favorites = this.favorites.filter(fid => fid !== id)
      }
      this.saveFavorites()
    },
    viewDetails(place) {
      this.$router.push({ path: `/place/${place.id}` })
    },
    loadMore() {
      this.displayLimit += 6
    }
  }
}
</script>

<style scoped>
.recommendations-page { background: var(--tw-bg); min-height: 100%; }
.content { padding: 0; }

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 700; letter-spacing: 0; line-height: 1.25; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 500; line-height: 1.55; }

.page-body { padding-top: 24px; padding-bottom: 46px; }
.user-card {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 20px 22px;
  border: 1px solid var(--tw-border);
  border-radius: 8px;
  box-shadow: var(--tw-shadow-sm);
}
.avatar {
  width:82px;
  height:82px;
  flex: 0 0 82px;
  border-radius:12px;
  background:#f1f5f9;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.avatar-img { width:100%; height:100%; object-fit:cover; display:block; }
.avatar-fallback { font-size:22px; font-weight:700; color:#475569 }
.user-info {
  min-width: 0;
  display: grid;
  gap: 12px;
}
.user-heading h2 { margin:0; font-size:1.55rem; line-height:1.2; letter-spacing:0; color:#0f172a; }
.user-info .email { margin:5px 0 0; color:#475569; font-size:1rem; line-height:1.35; }
.profile-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: #334155;
  width: fit-content;
  max-width: 100%;
  padding: 8px 12px 8px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.profile-icon {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  color:#475569;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.profile-icon svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.profile-value {
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-weight:700;
  color: #1f2937;
  line-height: 1.35;
}
.location-found-banner { display:flex; align-items:center; gap:12px; background:#f0fdf4; padding:14px 18px; border-radius:8px; margin-top:20px; border:1px solid #bbf7d0 }
.status-dot { width:10px; height:10px; flex:0 0 auto; border-radius:50%; background:#16a34a }
.status-dot.warning { background:#d97706 }
.location-found-banner p { margin:0; color:#065f46; font-size:0.95rem }
.location-found-banner strong { color:#047857; font-size:1.1rem }
.location-warning { display:flex; align-items:center; gap:12px; background:#fffbeb; padding:14px 18px; border-radius:8px; margin-top:14px; border:1px solid #f59e0b }
.location-warning p { margin:0; color:#92400e; font-size:0.95rem }
.section-title { margin-top:20px; margin-bottom:12px }
.grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px }

@media (max-width: 1100px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .user-card {
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
  }
  .avatar {
    width: 64px;
    height: 64px;
    flex-basis: 64px;
  }
  .user-heading h2 {
    font-size: 1.25rem;
  }
  .user-info .email {
    font-size: 0.92rem;
  }
  .profile-row {
    width: 100%;
    padding-right: 10px;
  }
  .grid { grid-template-columns: 1fr; }
  .profile-value { white-space:normal; }
}
.btn-outline { border:1px solid #6366f1; background:transparent; padding:10px 14px; border-radius:8px; color:#6366f1 }
.more { display:flex; justify-content:center; margin-top:18px }
.loading, .empty { padding:20px; text-align:center; color:#6b7280 }
</style>
