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
          <div v-else class="avatar-fallback">👤</div>
        </div>
        <div class="user-info">
          <h2>{{ user.name }}</h2>
          <p class="email" v-if="user.email">{{ user.email }}</p>
          <div class="badges">
            <span class="badge">🏠 {{ user.address || 'Chưa đặt địa chỉ' }}</span>
          </div>
        </div>
      </div>

      <div class="location-found-banner" v-if="nearbyCount > 0">
        <span class="banner-icon">📍</span>
        <p>Đã tìm thấy các địa điểm vui chơi gần bạn. Hiện tại có <strong>{{ nearbyCount }}</strong> địa điểm đang hoạt động!</p>
      </div>

      <div class="location-warning" v-if="isLocating && !userLocation">
        <span class="banner-icon">⏳</span>
        <p>Đang lấy vị trí của bạn...</p>
      </div>

      <div class="location-warning" v-else-if="!userLocation">
        <span class="banner-icon">⚠️</span>
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
import { getAllPlaces, reverseGeocode } from '../api/places'
import { getProfile, updateLocation } from '../api/auth'

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
      const token = localStorage.getItem('authToken')
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
            this.user.address = u.address || ''
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
      
      // Fallback to localStorage
      this.loadUserFromStorage()
      this.getUserLocationAndFetch()
    },
    loadUserFromStorage() {
      try {
        const authToken = localStorage.getItem('authToken')
        const raw = localStorage.getItem('user') || localStorage.getItem('profile') || null
        if (authToken && raw) {
          const parsed = JSON.parse(raw)
          const src = parsed && parsed.user && typeof parsed.user === 'object' ? parsed.user : parsed

          this.user.name = src.parentName || src.name || src.fullName || src.displayName || src.username || this.user.name
          this.user.email = src.email || src.mail || ''
          this.user.avatar = src.avatar || src.photoURL || src.image || ''
          this.user.numberOfKids = src.numberOfKids || src.kids || this.user.numberOfKids
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

          // Optionally persist to server for future sessions
          try {
            const token = localStorage.getItem('authToken')
            if (token) {
              await updateLocation({ lat: this.userLocation.lat, lng: this.userLocation.lng })
            }
          } catch (e) {
            console.warn('Failed to persist user location:', e)
          }

          // if user has no readable address stored, try reverse geocoding
          try {
            if (!this.user.address) {
              const rev = await reverseGeocode(this.userLocation.lat, this.userLocation.lng)
              if (rev && rev.success && rev.data) {
                this.user.address = rev.data
              }
            }
          } catch (e) {
            console.warn('Reverse geocode failed in frontend', e)
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
    avgRating(place) {
      if (place.averageRating) return Number(place.averageRating).toFixed(1)
      return 'なし'
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
    isFavorited(placeId) {
      return this.favorites.includes(placeId)
    },
    toggleFavorite(placeId) {
      if (this.isFavorited(placeId)) {
        this.favorites = this.favorites.filter(id => id !== placeId)
      } else {
        this.favorites.push(placeId)
      }
      this.saveFavorites()
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
    // goFavorites removed
    getImageUrl(imagePath) {
      if (!imagePath) return '/default.jpg'
      if (imagePath.startsWith('http')) return imagePath
      return `http://localhost:3000${imagePath}`
    },
    loadMore() {
      this.displayLimit += 6
    }
  }
}
</script>

<style scoped>
.recommendations-page { background: var(--tw-bg); min-height: 100%; }
.site-header { position: relative; z-index: 10; }
.content { padding: 0; }
.site-footer { background: #fff; border-top: 1px solid var(--tw-border); padding: 14px 16px; text-align: center; color: #6b7280; font-size: 0.9rem; }

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }
.page-hero-inner h1 { margin: 0 0 8px 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.03em; }
.page-hero-inner p { margin: 0; color: rgba(255,255,255,0.88); font-weight: 600; line-height: 1.5; }

.page-body { padding-top: 26px; padding-bottom: 46px; }
.user-card { display:flex; gap:16px; align-items:center; padding:16px; border:1px solid #eee; border-radius:8px; }
.user-card .avatar { width:64px; height:64px; border-radius:8px; background:#f3f4f6; display:flex; align-items:center; justify-content:center }
.avatar-img { width:64px; height:64px; object-fit:cover; border-radius:8px }
.avatar-fallback { font-size:28px }
.user-info .email { margin:4px 0; color:#374151; font-size:14px }
.coords { margin-top:6px; font-size:12px; color:#6b7280 }
.user-info h2 { margin:0; }
.muted { color:#6b7280; }
.badges { margin-top:8px; display:flex; gap:8px }
.badge { background:#fef2f2; color:#b91c1c; padding:6px 10px; border-radius:20px; font-weight:600 }
.location-found-banner { display:flex; align-items:center; gap:12px; background:linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding:16px 20px; border-radius:12px; margin-top:20px; border:1px solid #6ee7b7 }
.location-found-banner .banner-icon { font-size:1.5rem }
.location-found-banner p { margin:0; color:#065f46; font-size:0.95rem }
.location-found-banner strong { color:#047857; font-size:1.1rem }
.location-warning { display:flex; align-items:center; gap:12px; background:#fffbeb; padding:14px 18px; border-radius:12px; margin-top:14px; border:1px solid #f59e0b }
.location-warning p { margin:0; color:#92400e; font-size:0.95rem }
.section-title { margin-top:20px; margin-bottom:12px }
.grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px }

@media (max-width: 1100px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .grid { grid-template-columns: 1fr; }
}
.card { background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb; display:flex; flex-direction:column; height:auto; box-shadow:0 2px 8px rgba(0,0,0,0.04); transition:all 0.2s }
.card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); transform:translateY(-2px) }
.card-media { position:relative; height:180px; background:#f3f4f6; flex-shrink:0 }
.card-media img { width:100%; height:100%; object-fit:cover }
.favorite-btn { position:absolute; top:10px; right:10px; width:36px; height:36px; border-radius:50%; border:none; background:rgba(255,255,255,0.9); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; transition:all 0.2s; box-shadow:0 2px 6px rgba(0,0,0,0.1) }
.favorite-btn:hover { transform:scale(1.1); background:white }
.favorite-btn.active { background:#fee2e2 }
.fav { position:absolute; top:8px; right:8px; font-size:20px; cursor:pointer }
.badge-match { position:absolute; left:8px; top:8px; background:#7c3aed; color:#fff; padding:6px 10px; border-radius:20px; font-weight:700 }
.card-body { padding:16px; flex:1; display:flex; flex-direction:column }
.card-title { margin:0 0 8px 0; font-size:1.1rem; line-height:1.3; min-height:28px; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden }
.card-address { color:#6b7280; margin-bottom:12px; font-size:0.9rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:40px; line-height:1.4 }
.meta { display:flex; flex-direction:column; gap:8px; font-size:13px; color:#374151; margin-bottom:16px; min-height:52px }
.meta .meta-row { display:flex; flex-wrap:wrap; gap:12px; align-items:center }
.meta .no-rating { color:#9ca3af; font-style:italic }
.distance { color:#059669; font-weight:600 }
.btn { background:#6366f1; color:#fff; border:none; padding:12px 16px; border-radius:8px; width:100%; margin-top:auto; font-weight:500; cursor:pointer; transition:background 0.2s }
.btn:hover { background:#4f46e5 }
.btn-outline { border:1px solid #6366f1; background:transparent; padding:10px 14px; border-radius:8px; color:#6366f1 }
.more { display:flex; justify-content:center; margin-top:18px }
.loading, .empty { padding:20px; text-align:center; color:#6b7280 }
</style>
