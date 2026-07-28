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

          <CategoryFilter
            :categories="categoryOptions"
            :active-category="activeCategory"
            :total-count="places.length"
            @category-change="setActiveCategory"
          />

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
import CategoryFilter from '../components/CategoryFilter.vue'
import { getAllPlaces } from '../api/places'
import { getCategories } from '../api/categories'
import { filterPlacesByCategoryOptions, getCategoryOptions } from '../utils/placeFilters'

export default {
  name: 'AllPlaces',
  components: { PlaceCard, CategoryFilter },
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
      return filterPlacesByCategoryOptions(this.places, this.activeCategory, this.categoryOptions)
    },
    categoryOptions() {
      return getCategoryOptions(this.places, this.categories)
    }
  },
  mounted() {
    this.loadData()
  },
  watch: {
    '$route.query.category'(categoryId) {
      this.activeCategory = categoryId || 'all'
    }
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
      this.applyRouteCategory()
    },
    viewPlaceDetails(place) {
      this.$router.push({ path: `/place/${place._id || place.id}` })
    },
    setActiveCategory(categoryId) {
      this.activeCategory = categoryId
      this.$router.replace({
        path: '/places',
        query: categoryId && categoryId !== 'all' ? { category: categoryId } : {}
      })
    },
    applyRouteCategory() {
      const categoryId = this.$route.query.category
      this.activeCategory = typeof categoryId === 'string' && categoryId ? categoryId : 'all'
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
  .grid { grid-template-columns: 1fr; }
}
</style>
