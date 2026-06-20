<template>
  <div class="home-page">
    <main id="main" class="site-main">
      <section class="hero">
        <div class="hero-inner tw-container-wide">
          <div class="hero-content">
            <h1>Khám phá khu vui chơi cho trẻ em</h1>
            <p>Tìm những địa điểm và hoạt động thú vị cho bé</p>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="tw-container-wide">
          <div class="section-header centered">
            <h2 class="tw-section-title">Một số địa điểm vui chơi cho trẻ nhỏ</h2>
          </div>

          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

          <div class="places">
            <div v-if="locationLoading" class="loading-spinner">
              <p>Đang tải các địa điểm gần bạn...</p>
            </div>
            <div v-else class="carousel-container">
              <button
                v-if="canSlidePlaces"
                type="button"
                class="carousel-arrow left"
                @click="slidePrevPlaces"
                aria-label="Previous"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                v-if="canSlidePlaces"
                type="button"
                class="carousel-arrow right"
                @click="slideNextPlaces"
                aria-label="Next"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <transition-group name="slide" tag="div" class="grid">
                <PlaceCard
                  v-for="place in displayedPlaces"
                  :key="place._id"
                  :place="place"
                  :showTags="true"
                  :showButton="false"
                  @select="viewPlaceDetails"
                />
              </transition-group>
            </div>
            <div v-if="!locationLoading && allPlaces.length === 0 && !errorMessage" class="no-places">
              <p>Không tìm thấy địa điểm.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section-block section-activities">
        <div class="tw-container-wide">
          <div class="section-header centered">
            <h2 class="tw-section-title">Hoạt động thú vị</h2>
            <p class="tw-muted">Gợi ý các trải nghiệm phù hợp cho trẻ nhỏ</p>
          </div>

          <div class="activities-carousel">
            <button
              v-if="canSlideActivities"
              type="button"
              class="carousel-arrow left"
              @click="slidePrevActivities"
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              v-if="canSlideActivities"
              type="button"
              class="carousel-arrow right"
              @click="slideNextActivities"
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <transition-group name="slide" tag="div" class="activities-grid">
              <div
                v-for="activity in displayedActivities"
                :key="activity.id"
                class="activity-card"
              >
                <div class="activity-media">
                  <img :src="activity.image" :alt="activity.label" />
                </div>
                <div class="activity-body">
                  <h3 class="activity-title">{{ activity.label }}</h3>
                </div>
              </div>
            </transition-group>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import PlaceCard from '../components/PlaceCard.vue'
import { getAllPlaces } from '../api/places'
import { getFeaturedActivities } from '../api/tags'


export default {
  name: 'HomePage',
  components: { PlaceCard },
  data() {
    return {
      allPlaces: [],
      currentIndex: 0,
      displayCount: 3,
      activityItems: [],
      activityIndex: 0,
      activityDisplayCount: 3,
      errorMessage: '',
      locationLoading: true
    }
  },
  computed: {
    canSlidePlaces() {
      return this.allPlaces.length > this.displayCount
    },
    canSlideActivities() {
      return this.activityItems.length > this.activityDisplayCount
    },
    displayedPlaces() {
      if (this.allPlaces.length === 0) return []
      const result = []
      for (let i = 0; i < this.displayCount; i++) {
        const idx = (this.currentIndex + i) % this.allPlaces.length
        result.push(this.allPlaces[idx])
      }
      return result
    },
    displayedActivities() {
      if (!this.activityItems || this.activityItems.length === 0) return []
      const result = []
      for (let i = 0; i < this.activityDisplayCount; i++) {
        const idx = (this.activityIndex + i) % this.activityItems.length
        result.push(this.activityItems[idx])
      }
      return result
    }
  },
  mounted() {
    this.loadAllPlaces()
    this.loadActivities()
  },
  beforeUnmount() {
    // no-op
  },
  methods: {
    async loadAllPlaces() {
      this.locationLoading = true
      this.errorMessage = ''
      
      // Lấy tất cả địa điểm từ database
      const res = await getAllPlaces()
      if (res.success && res.data) {
        const mapped = res.data.map((place, idx) => ({
          _id: place.id || place.placeId || `place-${idx}`,
          name: place.name,
          address: place.address || '',
          ageRange: place.ageRange || '0-12',
          rating: place.rating || 0,
          image: place.image || null,
          images: place.images || [],
          price: place.price || 'Miễn phí',
          tags: place.tags || []
        }))
        // Shuffle array để random thứ tự
        this.allPlaces = mapped.sort(() => Math.random() - 0.5)
      } else {
        this.errorMessage = res.error || 'Không thể tải địa điểm'
      }
      this.locationLoading = false
    },
    slideNextPlaces() {
      if (this.allPlaces.length > this.displayCount) {
        this.currentIndex = (this.currentIndex + 1) % this.allPlaces.length
      }
    },
    slidePrevPlaces() {
      if (this.allPlaces.length > this.displayCount) {
        this.currentIndex = (this.currentIndex - 1 + this.allPlaces.length) % this.allPlaces.length
      }
    },
    slideNextActivities() {
      if (this.activityItems.length > this.activityDisplayCount) {
        this.activityIndex = (this.activityIndex + 1) % this.activityItems.length
      }
    },
    slidePrevActivities() {
      if (this.activityItems.length > this.activityDisplayCount) {
        this.activityIndex = (this.activityIndex - 1 + this.activityItems.length) % this.activityItems.length
      }
    },
    async loadActivities() {
      const res = await getFeaturedActivities()
      this.activityItems = res.success && Array.isArray(res.data) ? res.data : []
      this.activityIndex = 0
    },
    viewPlaceDetails(place) {
      this.$router.push({
        path: `/place/${place._id}`
      })
    }
  }
}
</script>

<style scoped>
.home-page {
  background: var(--tw-bg);
  min-height: 100%;
  overflow-x: hidden;
}

.site-header {
  position: relative;
  z-index: 10;
}

.hero {
  position: relative;
  padding: 64px 0 54px 0;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('~@/../public/Playground.jpg');
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.68) 0%,
    rgba(15, 23, 42, 0.35) 55%,
    rgba(248, 250, 252, 1) 100%
  );
}

.hero-inner {
  position: relative;
  z-index: 1;
}

.hero-content {
  max-width: 820px;
  margin: 0 auto;
  text-align: center;
  color: #ffffff;
}

.hero-content h1 {
  font-size: 2.4rem;
  margin: 0 0 12px 0;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.2;
}

.hero-content p {
  font-size: 1.05rem;
  margin: 0 0 20px 0;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.65;
  font-weight: 500;
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

.site-main {
  padding-bottom: 36px;
}

.section-block {
  padding: 28px 0 46px 0;
}

.section-header {
  margin-bottom: 18px;
}

.section-header.centered {
  text-align: center;
}

.section-header p {
  margin: 0;
}

.section-activities .section-header {
  margin-bottom: 14px;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
}

.activity-card {
  width: 100%;
  text-align: left;
  border: 1px solid var(--tw-border);
  background: var(--tw-surface);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.activity-card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
}

.activity-media {
  width: 100%;
  height: 220px;
  overflow: hidden;
}

.activity-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.activity-body {
  padding: 12px 12px 14px 12px;
}

.activity-title {
  margin: 0 0 6px 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--tw-text);
}

.activity-subtitle {
  margin: 0;
  color: var(--tw-muted);
  font-size: 0.9rem;
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 1;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.places {
  padding: 0;
  width: 100%;
}

.carousel-container {
  overflow: hidden;
  position: relative;
}

.activities-carousel {
  position: relative;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid var(--tw-border);
  background: var(--tw-surface);
  color: var(--tw-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--tw-shadow-sm);
  transition: background-color 0.12s ease, color 0.12s ease, transform 0.12s ease;
  z-index: 5;
}

.carousel-arrow:hover {
  background: var(--tw-bg);
  color: var(--tw-text);
  transform: translateY(-50%) scale(1.04);
}

.carousel-arrow svg {
  width: 20px;
  height: 20px;
  display: block;
}

.carousel-arrow.left {
  left: 8px;
}

.carousel-arrow.right {
  right: 8px;
}

/* Hide scrollbar */
.carousel-container::-webkit-scrollbar {
  display: none;
}
.carousel-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.places .grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px;
  position: relative;
}

/* Slide animation - smoother */
.slide-enter-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  opacity: 0;
  pointer-events: none;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-move {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 1100px) {
  .places .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 800px) {
  .places .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 1100px) {
  .activities-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .activities-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .places .grid { grid-template-columns: 1fr; }
  .places { padding: 12px; }
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

.no-places {
  width: 100%;
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 1rem;
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

@media (max-width: 640px) {
  .home-page {
    overflow-x: hidden;
  }

  .hero {
    min-height: auto;
  }

  .hero-content {
    padding: 42px 0 34px;
  }

  .places,
  .activities {
    padding-top: 26px;
    padding-bottom: 30px;
  }

  .section-header {
    align-items: flex-start;
    gap: 10px;
  }

  .section-header h2 {
    font-size: 1.25rem;
  }

  .slider-controls {
    gap: 8px;
  }

  .slider-btn {
    width: 38px;
    height: 38px;
  }

  .activity-media {
    height: 170px;
  }
}

</style>
