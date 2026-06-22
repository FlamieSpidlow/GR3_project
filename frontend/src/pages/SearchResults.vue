<template>
  <div class="search-results-page">
    <header class="site-header">
      <section class="search-hero">
        <div class="search-hero-inner tw-container-wide">
          <h1 class="search-title">Tìm kiếm địa điểm</h1>
          <p class="search-subtitle">Nhập từ khóa để tìm khu vui chơi phù hợp cho bé</p>

          <div class="search-bar-container">
            <input
              type="text"
              v-model="keyword"
              placeholder="VD: công viên, khu vui chơi trong nhà, miễn phí..."
              @keyup.enter="runSearchFromControls"
            />
            <button class="tw-btn tw-btn-primary" @click="runSearchFromControls" :disabled="isLoading">
              {{ isLoading ? 'Đang tìm kiếm...' : 'Tìm kiếm' }}
            </button>
          </div>

          <div class="search-age">
            <label>Độ tuổi phù hợp: <strong>{{ ageFilter }}</strong></label>
            <input
              v-model.number="ageFilter"
              type="range"
              min="1"
              max="12"
              step="1"
              aria-label="Chọn độ tuổi của bé"
            />
          </div>
        </div>
      </section>
    </header>

    <main class="site-main">
      <div class="main-layout">
        <!-- Filters Sidebar -->
        <aside class="filters-sidebar">
          <div class="filters-header">
            <h3>Bộ lọc</h3>
            <button v-if="hasActiveFilters" class="clear-filters-btn" @click="clearFilters">
              Xóa tất cả
            </button>
          </div>
          
          <div class="filter-group">
            <label class="filter-label range-label">
              Khoảng cách
              <span>{{ distanceFilterLabel }}</span>
            </label>
            <input
              v-model.number="filters.distanceMax"
              type="range"
              min="1"
              max="100"
              step="1"
              class="filter-range"
              aria-label="Lọc theo khoảng cách"
            />
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Đánh giá</label>
            <div class="filter-options">
              <button 
                :class="['filter-btn', { active: filters.rating === '' }]"
                @click="filters.rating = ''"
              >Tất cả</button>
              <button 
                :class="['filter-btn', { active: filters.rating === '5' }]"
                @click="filters.rating = '5'"
              >5 sao</button>
              <button 
                :class="['filter-btn', { active: filters.rating === '4' }]"
                @click="filters.rating = '4'"
              >4+ sao</button>
              <button 
                :class="['filter-btn', { active: filters.rating === '3' }]"
                @click="filters.rating = '3'"
              >3+ sao</button>
            </div>
          </div>
          
          <div class="filter-group">
            <label class="filter-label range-label">
              Giá tiền
              <span>{{ priceFilterLabel }}</span>
            </label>
            <input
              v-model.number="filters.priceMax"
              type="range"
              min="0"
              max="500000"
              step="10000"
              class="filter-range"
              aria-label="Lọc theo giá tiền"
            />
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Loại hình</label>
            <div class="filter-options">
              <button 
                :class="['filter-btn', { active: filters.indoor === '' }]"
                @click="filters.indoor = ''"
              >Tất cả</button>
              <button 
                :class="['filter-btn', { active: filters.indoor === 'indoor' }]"
                @click="filters.indoor = 'indoor'"
              >Trong nhà</button>
              <button 
                :class="['filter-btn', { active: filters.indoor === 'outdoor' }]"
                @click="filters.indoor = 'outdoor'"
              >Ngoài trời</button>
            </div>
          </div>
          
        </aside>

        <!-- Results Section -->
        <section class="results-section">
      <div v-if="isLoading" class="loading-spinner">
        <p>Đang tải kết quả...</p>
      </div>

      <div v-else-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-else-if="hasSearched && results.length === 0" class="no-results">
        <p>Không tìm thấy địa điểm nào khớp với "{{ initialKeyword }}"</p>
        <router-link to="/" class="back-link">Quay lại trang chủ</router-link>
      </div>

      <div v-else-if="results.length > 0 && filteredResults.length === 0" class="no-results">
        <p>Không có địa điểm nào phù hợp với bộ lọc đã chọn</p>
        <button class="clear-filters-btn" @click="clearFilters">Xóa bộ lọc</button>
      </div>

      <div v-else class="results-list">
        <div class="results-count">
          Tìm thấy {{ filteredResults.length }} địa điểm
        </div>
        <div class="results-grid">
          <PlaceCard
            v-for="place in paginatedResults"
            :key="place._id || place.id"
            :place="place"
            :showTags="true"
            :showButton="true"
            @select="onSelectPlace"
          />
        </div>
        
        <div class="pagination-container">
          <button class="pagination-btn" @click="prevPage" :disabled="currentPage === 1">← Trước</button>
          <div class="page-info">
            Trang {{ currentPage }} / {{ totalPages }} ({{ filteredResults.length }} kết quả)
          </div>
          <button class="pagination-btn" @click="nextPage" :disabled="currentPage === totalPages">Tiếp →</button>
        </div>
        </div>
      </section>
      </div>
    </main>
  </div>
</template>

<script>
import { searchPlaces } from '../api/places'
import { saveSearchHistory } from '../api/auth'
import { clearAuthSession, getAuthToken } from '../utils/authSession'
import { getBrowserLocationCached } from '../utils/clientCache'
import PlaceCard from '../components/PlaceCard.vue'
import { formatPrice, formatVnd, parsePriceValue } from '../utils/priceFormatter'

export default {
  name: 'SearchResults',
  components: { PlaceCard },
  data() {
    return {
      keyword: '',
      initialKeyword: '',
      results: [],
      isLoading: false,
      searchRequestId: 0,
      hasSearched: false,
      errorMessage: '',
      currentPage: 1,
      itemsPerPage: 10,
      userLocation: null,
      ageFilter: 3,
      filters: {
        distanceMax: 100,
        rating: '',
        priceMax: 500000,
        indoor: ''
      }
    }
  },
  async mounted() {
    const query = this.$route.query.q
    const age = this.$route.query.age
    if (age) {
      this.ageFilter = this.normalizeAge(age)
    }
    this.applyFilterQuery(this.$route.query)
    if (query) {
      this.keyword = query
      this.initialKeyword = query
      this.isLoading = true
    }

    await this.getUserLocation()

    if (query) {
      await this.performSearch()
    }
  },
  methods: {
    onSelectPlace(place) {
      const id = place && (place._id || place.id)
      if (!id) return
      this.$router.push(`/place/${id}`)
    },
    scrollToTop() {
      const container = document.querySelector('.app-main')
      if (container && typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    async getUserLocation() {
      const location = await getBrowserLocationCached({ timeout: 5000 })
      this.userLocation = location || null
    },
    normalizeText(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },
    normalizeAge(value) {
      const parsed = parseInt(value, 10)
      if (!Number.isFinite(parsed)) return 3
      return Math.min(12, Math.max(1, parsed))
    },
    normalizeDistanceMax(value) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return 100
      return Math.min(100, Math.max(1, Math.round(parsed)))
    },
    normalizePriceMax(value) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return 500000
      return Math.min(500000, Math.max(0, Math.round(parsed / 10000) * 10000))
    },
    applyFilterQuery(query) {
      if (!query) return
      this.filters.distanceMax = query.distance != null && query.distance !== ''
        ? this.normalizeDistanceMax(query.distance)
        : 100
      this.filters.priceMax = query.price != null && query.price !== ''
        ? this.normalizePriceMax(query.price)
        : 500000
      this.filters.indoor = query.indoor === 'indoor' || query.indoor === 'outdoor' ? query.indoor : ''
    },
    runSearchFromControls() {
      const query = this.keyword.trim()
      if (!query) {
        this.performSearch()
        return
      }

      this.ageFilter = this.normalizeAge(this.ageFilter)
      const nextQuery = {
        ...this.$route.query,
        q: query,
        age: String(this.ageFilter)
      }
      if (this.filters.distanceMax < 100) {
        nextQuery.distance = String(this.filters.distanceMax)
      } else {
        delete nextQuery.distance
      }
      if (this.filters.priceMax < 500000) {
        nextQuery.price = String(this.filters.priceMax)
      } else {
        delete nextQuery.price
      }
      if (this.filters.indoor) {
        nextQuery.indoor = this.filters.indoor
      } else {
        delete nextQuery.indoor
      }
      const currentQ = this.$route.query.q != null ? String(this.$route.query.q).trim() : ''
      const currentAge = this.$route.query.age != null ? String(this.$route.query.age) : ''

      if (currentQ === query && currentAge === nextQuery.age) {
        this.performSearch()
        return
      }

      this.$router.push({ path: '/search', query: nextQuery })
    },
    async performSearch() {
      const query = this.keyword.trim()
      if (!query) {
        this.errorMessage = 'Vui lòng nhập từ khóa tìm kiếm'
        this.results = []
        return
      }

      const requestId = ++this.searchRequestId
      this.isLoading = true
      this.hasSearched = true
      this.errorMessage = ''
      this.results = []
      this.currentPage = 1
      this.initialKeyword = query

      // Save search history if user is logged in
      const token = getAuthToken()
      if (token) {
        saveSearchHistory(query)
          .then(res => {
            if (res && res.status === 401) {
              clearAuthSession()
            }
          })
          .catch(err => console.warn('Failed to save search history:', err))
      }

      this.ageFilter = this.normalizeAge(this.ageFilter)
      const res = await searchPlaces(query, 100, this.userLocation?.lat || null, this.userLocation?.lng || null, this.ageFilter)
      if (requestId !== this.searchRequestId) return
      
      if (res.success && res.data) {
        // Map full place data from database.
        this.results = res.data.map((place, idx) => {
          let placeName = place.mainText || place.name || ''
          let placeAddress = place.secondaryText || place.address || ''
          
          if (!placeAddress && placeName.includes(',')) {
            const parts = placeName.split(',').map(p => p.trim())
            placeName = parts[0]
            placeAddress = parts.slice(1).join(', ')
          }
          
          // Use backend distance when available, otherwise calculate locally.
          let distance = place.distance !== undefined ? place.distance : null
          if (distance === null && this.userLocation && place.lat && place.lng) {
            distance = this.calculateDistance(
              this.userLocation.lat, this.userLocation.lng,
              place.lat, place.lng
            ) * 1000 // Convert km to meters to match backend.
          }
          
          return {
            _id: place.id || place.placeId || idx,
            name: placeName,
            address: placeAddress,
            description: placeAddress,
            image: place.image,
            images: place.images,
            ageRange: place.ageRange || '0-12',
            rating: place.rating || 0,
            price: formatPrice(place.price),
            lat: place.lat,
            lng: place.lng,
            distance: distance,
            tags: place.tags || []
          }
        })
      } else {
        this.errorMessage = res.error || 'Không tìm thấy địa điểm nào'
      }

      this.isLoading = false
    },
    calculateDistance(lat1, lng1, lat2, lng2) {
      // Haversine formula
      const R = 6371 // km
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLng = (lng2 - lng1) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    },
    parsePrice(priceStr) {
      return parsePriceValue(priceStr)
    },
    viewDetails(placeId) {
      this.$router.push(`/place/${placeId}`)
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
        this.scrollToTop()
      }
    },
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        this.scrollToTop()
      }
    },
    goToPage(page) {
      this.currentPage = page
      this.scrollToTop()
    },
    clearFilters() {
      this.filters = {
        distanceMax: 100,
        rating: '',
        priceMax: 500000,
        indoor: ''
      }
    }
  },
  computed: {
    hasActiveFilters() {
      return this.filters.distanceMax < 100 || this.filters.rating || this.filters.priceMax < 500000 || this.filters.indoor
    },
    distanceFilterLabel() {
      return this.filters.distanceMax >= 100 ? 'Tất cả' : `Dưới ${this.filters.distanceMax} km`
    },
    priceFilterLabel() {
      return this.filters.priceMax >= 500000 ? 'Tất cả' : `Dưới ${formatVnd(this.filters.priceMax)}`
    },
    filteredResults() {
      let filtered = [...this.results]
      
      // Filter by distance (p.distance is in meters, slider value is in km).
      if (this.filters.distanceMax < 100) {
        filtered = filtered.filter(p => {
          if (p.distance === null || p.distance === undefined) return false
          const distanceKm = p.distance / 1000
          return distanceKm <= this.filters.distanceMax
        })
      }
      
      // Filter by rating
      if (this.filters.rating) {
        const minRating = parseInt(this.filters.rating)
        filtered = filtered.filter(p => (p.rating || 0) >= minRating)
      }
      
      // Filter by price
      if (this.filters.priceMax < 500000) {
        filtered = filtered.filter(p => {
          const price = this.parsePrice(p.price)
          return price <= this.filters.priceMax
        })
      }
      
      // Filter by indoor/outdoor
      if (this.filters.indoor) {
        filtered = filtered.filter(p => {
          const tags = (p.tags || []).map(this.normalizeText)
          if (this.filters.indoor === 'indoor') {
            return tags.some(t => t.includes('trong nha') || t.includes('indoor'))
          } else if (this.filters.indoor === 'outdoor') {
            return tags.some(t => t.includes('ngoai troi') || t.includes('outdoor'))
          }
          return true
        })
      }
      
      return filtered
    },
    paginatedResults() {
      const start = (this.currentPage - 1) * this.itemsPerPage
      const end = start + this.itemsPerPage
      return this.filteredResults.slice(start, end)
    },
    totalPages() {
      return Math.ceil(this.filteredResults.length / this.itemsPerPage) || 1
    }
  },
  watch: {
    filters: {
      deep: true,
      handler() {
        this.currentPage = 1
      }
    },
    '$route.query': {
      deep: true,
      handler(newQuery, oldQuery) {
        this.applyFilterQuery(newQuery)
        const nextQ = newQuery && newQuery.q != null ? String(newQuery.q).trim() : ''
        const prevQ = oldQuery && oldQuery.q != null ? String(oldQuery.q).trim() : ''
        const nextAgeParam = newQuery && newQuery.age != null ? String(newQuery.age) : ''
        const prevAgeParam = oldQuery && oldQuery.age != null ? String(oldQuery.age) : ''

        const nextAge = newQuery && newQuery.age != null && newQuery.age !== '' ? this.normalizeAge(newQuery.age) : 3
        const prevAge = oldQuery && oldQuery.age != null && oldQuery.age !== '' ? this.normalizeAge(oldQuery.age) : 3

        if (nextQ && (nextQ !== prevQ || nextAge !== prevAge || nextAgeParam !== prevAgeParam)) {
          this.keyword = nextQ
          this.initialKeyword = nextQ
          this.ageFilter = nextAge
          this.performSearch()
        }
      }
    }
  }
}
</script>

<style scoped>
.search-results-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--tw-bg);
}

.site-header {
  position: relative;
  z-index: 10;
}

.search-hero {
  position: relative;
  padding: 34px 0 26px 0;
  overflow: hidden;
}

.search-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('~@/../public/Playground.jpg');
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.search-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.4) 55%, rgba(15, 23, 42, 0.25) 100%);
}

.search-hero-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  color: #ffffff;
}

.search-title {
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.25;
}

.search-subtitle {
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 500;
  line-height: 1.55;
}

.search-bar-container {
  display: flex;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
  flex-wrap: wrap;
  justify-content: center;
}

.search-bar-container input {
  padding: 12px 18px;
  width: 360px;
  border-radius: 8px;
  border: 2px solid rgba(226, 232, 240, 0.9);
  background: #ffffff;
  font-size: 0.95rem;
  color: #111827;
  outline: none;
}

.search-bar-container input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
}

.search-bar-container input::placeholder {
  color: #9ca3af;
}

.search-age {
  margin: 14px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: min(680px, 100%);
  flex-wrap: wrap;
}

.search-age label {
  color: #ffffff;
  font-weight: 800;
}

.search-age input[type="range"] {
  flex: 1 1 420px;
  min-width: 320px;
  max-width: 560px;
  width: 100%;
  accent-color: var(--tw-primary);
  cursor: pointer;
}

/* button uses global tw-btn */

.results-info {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.95;
  font-weight: 500;
}

.site-main {
  flex: 1;
  padding: 26px 0 46px 0;
}

.main-layout {
  display: flex;
  gap: 24px;
  max-width: var(--tw-container-wide);
  margin: 0 auto;
  padding: 0 24px;
}

/* Filters Sidebar */
.filters-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--tw-shadow-sm);
  border: 1px solid var(--tw-border);
  height: fit-content;
  position: sticky;
  top: 92px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.filters-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
}

.range-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.range-label span {
  color: var(--tw-primary);
  font-size: 0.78rem;
  font-weight: 800;
  text-align: right;
}

.filter-range {
  width: 100%;
  accent-color: var(--tw-primary);
  cursor: pointer;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid var(--tw-border);
  border-radius: 20px;
  font-size: 0.8rem;
  color: #6b7280;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.filter-btn:hover {
  border-color: rgba(99, 102, 241, 0.5);
  color: var(--tw-primary);
  background: rgba(99, 102, 241, 0.08);
}

.filter-btn.active {
  background: var(--tw-primary);
  color: white;
  border-color: var(--tw-primary);
}

.clear-filters-btn {
  background: none;
  color: #dc2626;
  border: none;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background: #fee2e2;
}

.results-section {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }
  
  .filters-sidebar {
    width: 100%;
    position: static;
  }
}

.loading-spinner {
  width: 100%;
  padding: 40px 20px;
  text-align: center;
  color: #6b72cf;
  font-size: 1.1rem;
  font-weight: 500;
}

.loading-spinner::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  margin-right: 12px;
  border: 3px solid #e9e5f5;
  border-top-color: #6b72cf;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background-color: rgba(220, 38, 38, 0.2);
  color: #fecaca;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #dc2626;
  font-size: 0.95rem;
}

.no-results {
  width: 100%;
  padding: 60px 20px;
  text-align: center;
}

.no-results p {
  font-size: 1rem;
  color: #9ca3af;
  margin-bottom: 20px;
}

.back-link {
  display: inline-block;
  color: white;
  text-decoration: none;
  padding: 12px 28px;
  background-color: #6366f1;
  border: none;
  border-radius: 8px;
  transition: opacity 0.3s ease;
  font-weight: 600;
}

.back-link:hover {
  opacity: 0.9;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.results-count {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 10px;
  font-weight: 500;
}

.result-item {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  gap: 18px;
  align-items: flex-start;
  border: 1px solid #f3f4f6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  transition: box-shadow 0.3s ease;
  overflow: hidden;
  position: relative;
}

.place-image {
  width: 220px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  transition: none;
}

.place-info {
  flex: 1;
  padding-right: 20px;
}

.place-info h3 {
  margin: 0 0 14px 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.location {
  color: #6b7280;
  font-weight: 500;
  margin: 6px 0 !important;
  font-size: 0.9rem !important;
  line-height: 1.4;
}

.place-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}

.place-tags .tag {
  font-size: 0.7rem;
  padding: 3px 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-weight: 500;
}

.place-info p {
  margin: 10px 0;
  color: #6b7280;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.result-item:hover .place-info p {
  color: #1a1f36;
}

.age-group {
  color: #1976d2;
  font-weight: 500;
}

.rating {
  color: #f59e0b;
  font-weight: 500;
}

.meta-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.meta-tag {
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #4b5563;
  font-weight: 500;
}

.meta-tag.distance-tag {
  background: #ecfdf5;
  color: #059669;
  font-weight: 600;
}

.details-btn {
  padding: 12px 32px;
  background-color: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: opacity 0.3s ease;
  white-space: nowrap;
  font-size: 0.95rem;
}

.site-footer {
  position: relative;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  background: #ffffff;
  border-top: 1px solid var(--tw-border);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-container {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #f3f4f6;
}

.pagination-btn {
  padding: 8px 16px;
  background-color: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: opacity 0.3s ease;
}

.pagination-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-weight: 600;
  color: #1a1f36;
  font-size: 0.92rem;
}

.footer-text {
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .result-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .place-image {
    width: 100%;
    height: 200px;
  }

  .place-info {
    padding-right: 0;
    width: 100%;
  }

  .details-btn {
    width: 100%;
  }

  .search-header {
    padding: 30px 15px;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
  }

  .results-section {
    padding: 30px 15px;
  }

  .search-bar-container input {
    width: 100%;
  }

  .search-age {
    align-items: flex-start;
  }

  .search-age input[type="range"] {
    min-width: 100%;
    max-width: 100%;
  }
}
</style>
