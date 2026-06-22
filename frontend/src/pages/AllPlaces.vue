<template>
  <div class="all-places-page">
    <main class="content">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Tất cả địa điểm</h1>
          <p>Khám phá toàn bộ địa điểm vui chơi đã được phân loại</p>
        </div>
      </section>

      <section class="page-body">
        <div class="tw-container-wide">
          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

          <div class="category-filter">
            <div class="filter-heading">
              <h2>Phân loại địa điểm</h2>
              <span v-if="!loading">{{ filteredPlaces.length }} địa điểm</span>
            </div>
            <div v-if="categoryOptions.length > 1" class="category-tabs" aria-label="Phân loại địa điểm">
              <button
                v-for="category in categoryOptions"
                :key="category.id"
                type="button"
                :class="['category-tab', { active: activeCategory === category.id }]"
                @click="activeCategory = category.id"
              >
                <span>{{ category.label }}</span>
                <span class="category-count">{{ category.count }}</span>
              </button>
            </div>
            <div v-else class="category-loading">Đang tải danh mục...</div>
          </div>

          <div v-if="loading" class="loading">Đang tải...</div>
          <div v-else-if="places.length === 0" class="empty">Không có địa điểm.</div>
          <div v-else-if="filteredPlaces.length === 0" class="empty">Không có địa điểm phù hợp với phân loại đã chọn.</div>
          <div v-else class="grid">
            <PlaceCard
              v-for="place in filteredPlaces"
              :key="place._id || place.id"
              :place="place"
              :showTags="true"
              @select="viewPlaceDetails"
            />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import PlaceCard from '../components/PlaceCard.vue'
import { getAllPlaces } from '../api/places'
import { getCategories } from '../api/categories'
import { getCategoryId, getCategoryLabel, normalizeText } from '../utils/placeFilters'

export default {
  name: 'AllPlaces',
  components: { PlaceCard },
  data() {
    return {
      places: [],
      categories: [],
      activeCategory: 'all',
      loading: true,
      errorMessage: ''
    }
  },
  computed: {
    filteredPlaces() {
      if (!this.activeCategory || this.activeCategory === 'all') return this.places
      const selected = this.categoryOptions.find(category => category.id === this.activeCategory)
      const selectedLabel = normalizeText(selected && selected.label)
      return this.places.filter(place =>
        getCategoryId(place.category) === this.activeCategory ||
        (selectedLabel && normalizeText(getCategoryLabel(place.category)) === selectedLabel)
      )
    },
    categoryOptions() {
      const countsById = this.places.reduce((acc, place) => {
        const id = getCategoryId(place.category)
        if (id) acc[id] = (acc[id] || 0) + 1
        return acc
      }, {})
      const countsByName = this.places.reduce((acc, place) => {
        const name = normalizeText(getCategoryLabel(place.category))
        if (name) acc[name] = (acc[name] || 0) + 1
        return acc
      }, {})

      const categoryItems = this.categories
        .map(category => {
          const id = getCategoryId(category)
          const label = getCategoryLabel(category)
          const nameKey = normalizeText(label)
          return {
            id,
            label,
            count: countsById[id] || countsByName[nameKey] || 0
          }
        })
        .filter(category => category.id && category.label)

      return [
        { id: 'all', label: 'Tất cả', count: this.places.length },
        ...categoryItems
      ]
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      this.errorMessage = ''
      const [placesRes, categoriesRes] = await Promise.all([
        getAllPlaces({ force: true }),
        getCategories()
      ])

      if (categoriesRes && categoriesRes.success) {
        this.categories = categoriesRes.data || []
      }

      if (placesRes && placesRes.success) {
        this.places = (placesRes.data || []).map((place, idx) => ({
          _id: place.id || place._id || place.placeId || `place-${idx}`,
          id: place.id || place._id || place.placeId || `place-${idx}`,
          name: place.name,
          address: place.address || '',
          ageRange: place.ageRange || '0-12',
          rating: place.rating || 0,
          image: place.image || null,
          images: place.images || [],
          price: place.price || 'Miễn phí',
          category: place.category || null,
          tags: place.tags || []
        }))
      } else {
        this.errorMessage = placesRes?.error || 'Không thể tải địa điểm'
        this.places = []
      }

      this.loading = false
    },
    viewPlaceDetails(place) {
      this.$router.push({ path: `/place/${place._id || place.id}` })
    }
  }
}
</script>

<style scoped>
.all-places-page {
  background: var(--tw-bg);
  min-height: 100%;
}

.content {
  padding: 0;
}

.page-hero {
  position: relative;
  padding: 34px 0 26px 0;
  overflow: hidden;
}

.page-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('~@/../public/Playground.jpg');
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.page-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.45) 60%, rgba(15, 23, 42, 0.3) 100%);
}

.page-hero-inner {
  position: relative;
  z-index: 1;
  color: #ffffff;
  text-align: center;
}

.page-hero-inner h1 {
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.25;
}

.page-hero-inner p {
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 500;
  line-height: 1.55;
}

.page-body {
  padding: 26px 0 46px;
}

.category-filter {
  margin-bottom: 20px;
}

.filter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.filter-heading h2 {
  margin: 0;
  color: var(--tw-text);
  font-size: 1.15rem;
  line-height: 1.35;
  font-weight: 850;
}

.filter-heading span {
  color: var(--tw-muted);
  font-size: 0.92rem;
  font-weight: 700;
  white-space: nowrap;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-tab {
  border: 1px solid var(--tw-border);
  background: #ffffff;
  color: #475569;
  border-radius: 999px;
  min-height: 36px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 850;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.category-tab:hover {
  background: #f8fafc;
  color: #0f172a;
}

.category-tab.active {
  background: var(--tw-primary);
  border-color: var(--tw-primary);
  color: #ffffff;
}

.category-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.78rem;
  line-height: 1;
}

.category-tab.active .category-count {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.category-loading {
  min-height: 38px;
  display: flex;
  align-items: center;
  color: var(--tw-muted);
  font-weight: 700;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}

.error-message {
  background-color: #fff5f5;
  color: #c53030;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 0 0 16px 0;
  font-size: 0.9rem;
  border-left: 3px solid #fc8181;
}

.loading,
.empty {
  padding: 42px 20px;
  text-align: center;
  color: #6b7280;
}

@media (max-width: 1100px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .filter-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .grid { grid-template-columns: 1fr; }
}
</style>
