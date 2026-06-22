<template>
    <div class="favour-page">
      <main class="content">
        <section class="page-hero">
          <div class="page-hero-inner tw-container-wide">
            <h1 class="title-with-icon">
              <svg class="title-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Địa điểm yêu thích</span>
            </h1>
            <p class="subtitle">Danh sách các địa điểm bạn đã lưu</p>
          </div>
        </section>

        <section class="page-body">
        <div class="tw-container-wide">

          <div class="location-warning" v-if="isLocating && !userLocation">
            <span class="warn-icon">⏳</span>
            <p>Đang lấy vị trí của bạn...</p>
          </div>

          <div class="location-warning" v-else-if="!userLocation">
            <span class="warn-icon">⚠️</span>
            <p>Chưa lấy được vị trí của bạn nên <strong>không hiển thị khoảng cách</strong>. Hãy bật quyền định vị cho website trong trình duyệt.</p>
          </div>

          <div v-if="isLoading" class="loading">
            <p>Đang tải...</p>
          </div>

          <div v-else-if="favoritePlaces.length === 0" class="empty-state">
            <div class="empty-icon">💔</div>
            <p>Bạn chưa lưu địa điểm nào.</p>
            <router-link to="/" class="btn-primary">Khám phá ngay</router-link>
          </div>

          <div v-else class="grid">
            <PlaceCard
              v-for="place in favoritePlaces"
              :key="place._id || place.id"
              :place="place"
              :favorited="true"
              :showTags="false"
              @select="onSelectPlace"
              @favorite-toggle="onFavoriteToggle"
            />
          </div>
        </div>
        </section>
      </main>
    </div>
</template>

<script>
import PlaceCard from '../components/PlaceCard.vue'
import { getPlaceById } from '../api/places'
import { getProfile, updateLocation } from '../api/auth'
import { assetUrl } from '../utils/apiBase'
import { getAuthToken } from '../utils/authSession'
import { getBrowserLocationCached } from '../utils/clientCache'

export default {
  name: 'FavourPage',
  components: { PlaceCard },
  data() {
    return { 
      favorites: [],
      favoritePlaces: [],
      isLoading: false,
      userLocation: null,
      isLocating: false
    }
  },
  async mounted() {
    await this.initUserLocation()
    this.loadFavorites()
  },
  methods: {
    coerceNumber(v) {
      if (v === null || v === undefined || v === '') return null
      const n = typeof v === 'number' ? v : parseFloat(v)
      return Number.isFinite(n) ? n : null
    },
    setUserLocation(lat, lng) {
      const latNum = this.coerceNumber(lat)
      const lngNum = this.coerceNumber(lng)
      if (latNum === null || lngNum === null) return false
      this.userLocation = { lat: latNum, lng: lngNum }
      return true
    },
    async loadUserLocationFromProfile() {
      const token = getAuthToken()
      if (!token) return
      try {
        const res = await getProfile()
        if (res && res.success && res.user && res.user.lat != null && res.user.lng != null) {
          this.setUserLocation(res.user.lat, res.user.lng)
        }
      } catch {
        // ignore
      }
    },
    async initUserLocation() {
      // Prefer profile location first so distance can render immediately
      await this.loadUserLocationFromProfile()
      // Then attempt to refresh from browser geolocation
      this.getUserLocation()
    },
    async loadFavorites() {
      try {
        const token = getAuthToken()
        if (token) {
          const profileRes = await getProfile()
          this.favorites = profileRes.success && profileRes.user && Array.isArray(profileRes.user.favorites)
            ? profileRes.user.favorites
            : []
        } else {
          this.favorites = []
        }
        
        if (this.favorites.length === 0) {
          this.favoritePlaces = []
          return
        }

        this.isLoading = true
        
        // Fetch details for each favorite place
        const placePromises = this.favorites.map(id => getPlaceById(id))
        const results = await Promise.all(placePromises)
        
        this.favoritePlaces = results
          .filter(res => res.success && res.data)
          .map(res => {
            const place = res.data
            // Tính khoảng cách nếu có vị trí người dùng
            const pLat = this.coerceNumber(place.lat)
            const pLng = this.coerceNumber(place.lng)
            place.lat = pLat
            place.lng = pLng
            if (this.userLocation && pLat != null && pLng != null) {
              place.distance = this.calculateDistance(
                this.userLocation.lat, this.userLocation.lng,
                pLat, pLng
              )
            } else {
              place.distance = null
            }
            return place
          })
        
        this.isLoading = false
      } catch (e) {
        console.error('Error loading favorites:', e)
        this.favorites = []
        this.favoritePlaces = []
        this.isLoading = false
      }
    },
    removeFavorite(placeId) {
      this.favorites = this.favorites.filter(id => id !== placeId)
      this.favoritePlaces = this.favoritePlaces.filter(p => (p._id || p.id) !== placeId)
    },
    onSelectPlace(place) {
      this.$router.push(`/place/${place._id || place.id}`)
    },
    onFavoriteToggle({ id, favorited, favorites }) {
      if (Array.isArray(favorites)) {
        this.favorites = favorites
      }
      if (!favorited) {
        this.removeFavorite(id)
      }
    },
    viewDetails(placeId) {
      this.$router.push(`/place/${placeId}`)
    },
    getImageUrl(imagePath) {
      if (!imagePath) return '/Playground.jpg'
      return assetUrl(imagePath)
    },
    async getUserLocation() {
      this.isLocating = true
      const location = await getBrowserLocationCached({ timeout: 5000 })
      if (!location) {
        this.userLocation = null
        this.isLocating = false
        return
      }

      this.setUserLocation(location.lat, location.lng)

      try {
        const token = getAuthToken()
        if (token) {
          await updateLocation({ lat: this.userLocation.lat, lng: this.userLocation.lng })
        }
      } catch (e) {
        console.warn('Failed to persist user location:', e)
      }

      this.favoritePlaces = this.favoritePlaces.map(place => {
        const pLat = this.coerceNumber(place.lat)
        const pLng = this.coerceNumber(place.lng)
        place.lat = pLat
        place.lng = pLng
        place.distance = pLat != null && pLng != null
          ? this.calculateDistance(this.userLocation.lat, this.userLocation.lng, pLat, pLng)
          : null
        return place
      })

      this.isLocating = false
    },
    calculateDistance(lat1, lng1, lat2, lng2) {
      const aLat = this.coerceNumber(lat1)
      const aLng = this.coerceNumber(lng1)
      const bLat = this.coerceNumber(lat2)
      const bLng = this.coerceNumber(lng2)
      if (aLat === null || aLng === null || bLat === null || bLng === null) return null

      const R = 6371000 // Bán kính trái đất (m)
      const toRad = deg => deg * Math.PI / 180
      const dLat = toRad(bLat - aLat)
      const dLng = toRad(bLng - aLng)
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c // Khoảng cách tính bằng mét
    }
  }
}
</script>

<style scoped>
.favour-page { 
  background: var(--tw-bg);
  min-height: 100%;
}

.page-header { 
  position: relative;
  z-index: 10;
}

.content { 
  padding: 0;
}

.page-footer { 
  position: relative;
  background: #fff;
  border-top: 1px solid var(--tw-border);
  padding: 14px 16px;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
}

.page-hero { position: relative; padding: 34px 0 26px 0; overflow: hidden; }
.page-hero::before { content: ''; position: absolute; inset: 0; background-image: url('~@/../public/Playground.jpg'); background-size: cover; background-position: center; transform: scale(1.02); }
.page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%); }
.page-hero-inner { position: relative; z-index: 1; text-align: center; color: #fff; }

.page-body { padding-top: 26px; padding-bottom: 46px; }

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin: 0;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.title-icon {
  width: 22px;
  height: 22px;
  color: #ffffff;
  flex: 0 0 22px;
  display: block;
}

.subtitle {
  color: rgba(255,255,255,0.88);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  margin: 0;
}

.location-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fffbeb;
  border: 1px solid #f59e0b;
  color: #92400e;
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 18px;
}

.location-warning p {
  margin: 0;
}

.warn-icon {
  font-size: 1.1rem;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-state p {
  color: #6b7280;
  font-size: 1.1rem;
  margin-bottom: 24px;
}

.btn-primary {
  display: inline-block;
  padding: 12px 28px;
  background: #6366f1;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #4f46e5;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}

@media (max-width: 1100px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 800px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
