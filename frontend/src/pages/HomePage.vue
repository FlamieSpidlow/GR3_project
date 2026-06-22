<template>
  <div class="home-page">
    <main id="main" class="site-main">
      <section class="hero">
        <div class="hero-bg" aria-hidden="true"></div>
        <div class="hero-inner tw-container-wide">
          <div class="hero-copy">
            <span class="hero-kicker">TheWeekend</span>
            <h1>Chọn điểm vui chơi cuối tuần cho cả gia đình</h1>
            <p>Khám phá khu vui chơi, công viên, bảo tàng và trải nghiệm ngoài trời phù hợp cho trẻ em.</p>
          </div>

          <div class="hero-stats" aria-label="Thống kê nhanh">
            <div v-for="stat in heroStats" :key="stat.label" class="stat-item">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section-block category-section">
        <div class="tw-container-wide">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">Khám phá theo nhu cầu</span>
              <h2>10 loại địa điểm vui chơi</h2>
            </div>
            <router-link to="/places" class="text-link">Xem tất cả -&gt;</router-link>
          </div>

          <div class="category-card-grid">
            <button
              v-for="category in categoryCards"
              :key="category.id"
              type="button"
              :class="['category-card', { active: activeCategory === category.id }]"
              @click="selectCategory(category.id)"
            >
              <img :src="category.image" :alt="category.label" />
              <span class="category-overlay"></span>
              <span class="category-content">
                <strong>{{ category.label }}</strong>
                <small>{{ category.count }} địa điểm</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      <section class="section-block featured-section">
        <div class="tw-container-wide">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">Địa điểm nổi bật</span>
              <h2>Những điểm đến được yêu thích</h2>
            </div>
            <router-link to="/places" class="text-link">Tất cả -&gt;</router-link>
          </div>

          <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

          <div v-if="locationLoading" class="loading-spinner">
            <p>Đang tải các địa điểm phù hợp...</p>
          </div>

          <div v-else-if="featuredPlaces.length" class="featured-grid">
            <PlaceCard
              v-for="place in featuredPlaces"
              :key="place._id"
              :place="place"
              :showTags="true"
              :showButton="false"
              @select="viewPlaceDetails"
            />
          </div>

          <div v-else class="no-places">
            <p>Chưa có địa điểm phù hợp với loại đã chọn.</p>
          </div>
        </div>
      </section>

      <section v-if="exploreAreas.length" class="section-block explore-section">
        <div class="tw-container-wide">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">Khu vực khám phá</span>
              <h2>Lên lịch cho từng kiểu cuối tuần</h2>
            </div>
          </div>

          <div class="explore-grid">
            <article v-for="area in exploreAreas" :key="area._id || area.title" class="explore-card">
              <img :src="getContentImage(area)" :alt="area.title" />
              <div>
                <span>{{ area.badge }}</span>
                <h3>{{ area.title }}</h3>
                <p>{{ area.description }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section v-if="offers.length" class="section-block offers-section">
        <div class="tw-container-wide">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">Ưu đãi & sự kiện</span>
              <h2>Hoạt động mới cho gia đình</h2>
            </div>
          </div>

          <div class="offer-grid">
            <article v-for="offer in offers" :key="offer._id || offer.title" class="offer-card">
              <span>{{ offer.dateLabel }}</span>
              <h3>{{ offer.title }}</h3>
              <p>{{ offer.description }}</p>
              <router-link :to="offer.link || '/places'">Khám phá -&gt;</router-link>
            </article>
          </div>
        </div>
      </section>

      <section v-if="reviews.length" class="section-block review-section">
        <div class="tw-container-wide review-layout">
          <div class="review-copy">
            <span class="section-eyebrow">Trải nghiệm thật</span>
            <h2>Phụ huynh nói gì về TheWeekend</h2>
            <p>Những chia sẻ gần đây từ các gia đình đã trải nghiệm.</p>
          </div>
          <div class="review-grid">
            <article v-for="review in reviews" :key="review._id" class="review-card">
              <div class="stars">{{ getStars(review.rating) }}</div>
              <p>“{{ review.comment }}”</p>
              <strong>{{ getReviewerName(review) }}</strong>
              <span>{{ review.place?.name || 'Địa điểm vui chơi' }}</span>
            </article>
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
import { getHomeContent } from '../api/homeContent'
import { getLatestReviews } from '../api/reviews'
import { getCategoryId, getCategoryLabel, normalizeText } from '../utils/placeFilters'

const fallbackImage = '/Playground.jpg'

export default {
  name: 'HomePage',
  components: { PlaceCard },
  data() {
    return {
      allPlaces: [],
      categories: [],
      homeContent: {
        explore: [],
        offers: []
      },
      latestReviews: [],
      activeCategory: 'all',
      errorMessage: '',
      locationLoading: true
    }
  },
  computed: {
    heroStats() {
      return [
        { value: `${this.allPlaces.length || 0}+`, label: 'địa điểm' },
        { value: `${this.categories.length || 0}`, label: 'loại địa điểm vui chơi' }
      ]
    },
    categoryCards() {
      const countsById = this.allPlaces.reduce((acc, place) => {
        const id = getCategoryId(place.category)
        if (id) acc[id] = (acc[id] || 0) + 1
        return acc
      }, {})

      const countsByName = this.allPlaces.reduce((acc, place) => {
        const name = normalizeText(getCategoryLabel(place.category))
        if (name) acc[name] = (acc[name] || 0) + 1
        return acc
      }, {})

      return this.categories.map(category => {
        const id = getCategoryId(category)
        const label = getCategoryLabel(category)
        return {
          id,
          label,
          count: countsById[id] || countsByName[normalizeText(label)] || 0,
          image: this.getCategoryImage(id, label)
        }
      }).filter(category => category.id && category.label)
    },
    filteredPlaces() {
      if (this.activeCategory === 'all') return this.allPlaces
      const selected = this.categoryCards.find(category => category.id === this.activeCategory)
      const selectedName = normalizeText(selected && selected.label)
      return this.allPlaces.filter(place =>
        getCategoryId(place.category) === this.activeCategory ||
        (selectedName && normalizeText(getCategoryLabel(place.category)) === selectedName)
      )
    },
    featuredPlaces() {
      return [...this.filteredPlaces]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6)
    },
    exploreAreas() {
      return this.homeContent.explore || []
    },
    offers() {
      return this.homeContent.offers || []
    },
    reviews() {
      return this.latestReviews || []
    }
  },
  mounted() {
    this.loadHomeData()
  },
  methods: {
    async loadHomeData() {
      this.locationLoading = true
      this.errorMessage = ''

      const [placeRes, categoryRes, homeRes, reviewRes] = await Promise.all([
        getAllPlaces({ force: true }),
        getCategories(),
        getHomeContent(),
        getLatestReviews(4)
      ])

      if (categoryRes && categoryRes.success) {
        this.categories = categoryRes.data || []
      }

      if (homeRes && homeRes.success && homeRes.data) {
        this.homeContent = {
          explore: homeRes.data.explore || [],
          offers: homeRes.data.offers || []
        }
      }

      if (reviewRes && reviewRes.success) {
        this.latestReviews = reviewRes.data || []
      }

      if (placeRes && placeRes.success && placeRes.data) {
        this.allPlaces = placeRes.data.map((place, idx) => ({
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
        this.errorMessage = placeRes?.error || 'Không thể tải địa điểm'
      }

      this.locationLoading = false
    },
    selectCategory(categoryId) {
      this.$router.push({
        path: '/places',
        query: categoryId && categoryId !== 'all' ? { category: categoryId } : {}
      })
    },
    viewPlaceDetails(place) {
      this.$router.push({ path: `/place/${place._id || place.id}` })
    },
    getPlaceImage(place) {
      if (!place) return fallbackImage
      return (place.images && place.images[0]) || place.image || fallbackImage
    },
    getCategoryImage(categoryId = '', label = '') {
      const labelNorm = normalizeText(label)
      const place = this.allPlaces.find(item =>
        (categoryId && getCategoryId(item.category) === categoryId) ||
        (labelNorm && normalizeText(getCategoryLabel(item.category)) === labelNorm)
      ) || this.allPlaces[0]
      return this.getPlaceImage(place)
    },
    getContentImage(item) {
      const keyword = normalizeText(item && item.placeKeyword)
      const place = keyword
        ? this.allPlaces.find(p => normalizeText(p.name).includes(keyword))
        : null
      return this.getPlaceImage(place || this.allPlaces[0])
    },
    getStars(rating) {
      const count = Math.max(1, Math.min(5, Number(rating) || 5))
      return '★★★★★'.slice(0, count)
    },
    getReviewerName(review) {
      return review?.user?.parentName || review?.user?.username || 'Người dùng TheWeekend'
    }
  }
}
</script>

<style scoped>
.home-page {
  background: var(--tw-bg);
  color: #0f172a;
  min-height: 100%;
  overflow-x: hidden;
}

.site-main {
  padding-bottom: 0;
}

.hero {
  position: relative;
  min-height: 560px;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(90deg, rgba(17, 24, 39, 0.64) 0%, rgba(17, 24, 39, 0.36) 52%, rgba(17, 24, 39, 0.18) 100%),
    url('~@/../public/Playground.jpg');
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 150px;
  background: linear-gradient(180deg, rgba(247, 248, 250, 0) 0%, var(--tw-bg) 86%);
}

.hero-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  padding-top: 86px;
  padding-bottom: 92px;
}

.hero-copy {
  max-width: 760px;
  color: #ffffff;
}

.hero-kicker,
.section-eyebrow {
  display: inline-flex;
  align-items: center;
  color: #4f6f8f;
  font-size: 0.82rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-kicker {
  color: #bae6fd;
  margin-bottom: 14px;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(2.5rem, 6vw, 5.15rem);
  line-height: 1.02;
  font-weight: 720;
  letter-spacing: 0;
  max-width: 850px;
}

.hero-copy p {
  max-width: 610px;
  margin: 22px 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.12rem;
  line-height: 1.7;
  font-weight: 480;
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}

.stat-item {
  min-width: 170px;
  padding: 14px 16px;
  border-radius: 8px;
  color: #ffffff;
  background: rgba(17, 24, 39, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
}

.stat-item strong {
  display: block;
  font-size: 1.3rem;
  line-height: 1.1;
}

.stat-item span {
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.85rem;
  font-weight: 550;
}

.section-block {
  padding: 54px 0;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.section-heading h2 {
  margin: 7px 0 0;
  color: #0f172a;
  font-size: clamp(1.65rem, 3vw, 2.35rem);
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: 0;
}

.text-link {
  color: var(--tw-primary-600);
  text-decoration: none;
  font-weight: 650;
  white-space: nowrap;
}

.category-card-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.category-card {
  position: relative;
  min-height: 168px;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  text-align: left;
  background: #0f172a;
  box-shadow: none;
  border: 1px solid var(--tw-border);
}

.category-card img,
.explore-card img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.25s ease;
}

.category-card:hover img,
.category-card.active img,
.explore-card:hover img {
  transform: scale(1.025);
}

.category-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.08) 0%, rgba(17, 24, 39, 0.72) 100%);
}

.category-content {
  position: absolute;
  inset: auto 14px 14px;
  color: #ffffff;
}

.category-content strong {
  display: block;
  font-size: 1rem;
  line-height: 1.25;
  font-weight: 650;
}

.category-content small {
  display: inline-flex;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 500;
}

.category-card.active {
  outline: 2px solid rgba(79, 111, 143, 0.5);
  outline-offset: -2px;
}

.featured-section,
.review-section {
  background: #ffffff;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.explore-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr;
  gap: 18px;
}

.explore-card {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  border-radius: 8px;
  background: #0f172a;
  box-shadow: none;
  border: 1px solid var(--tw-border);
}

.explore-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.06) 0%, rgba(17, 24, 39, 0.72) 100%);
}

.explore-card div {
  position: absolute;
  z-index: 1;
  left: 22px;
  right: 22px;
  bottom: 22px;
  color: #ffffff;
}

.explore-card span {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 5px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 0.78rem;
  font-weight: 600;
}

.explore-card h3 {
  margin: 0 0 8px;
  font-size: 1.45rem;
  line-height: 1.2;
}

.explore-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.55;
  font-weight: 450;
}

.offers-section {
  background: var(--tw-bg);
}

.offer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.offer-card,
.review-card {
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: none;
}

.offer-card {
  padding: 24px;
}

.offer-card span {
  color: #ea580c;
  font-size: 0.82rem;
  font-weight: 650;
}

.offer-card h3 {
  margin: 10px 0 8px;
  font-size: 1.25rem;
  line-height: 1.25;
}

.offer-card p {
  color: #475569;
  margin: 0 0 18px;
  line-height: 1.6;
  font-weight: 450;
}

.offer-card a {
  color: var(--tw-primary-600);
  text-decoration: none;
  font-weight: 650;
}

.review-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
  gap: 28px;
  align-items: center;
}

.review-copy h2 {
  margin: 8px 0 14px;
  font-size: clamp(1.7rem, 3vw, 2.45rem);
  line-height: 1.15;
}

.review-copy p {
  margin: 0;
  color: #475569;
  line-height: 1.7;
  font-weight: 450;
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.review-card {
  padding: 22px;
}

.stars {
  color: #f59e0b;
  letter-spacing: 0;
  margin-bottom: 12px;
}

.review-card p {
  color: #334155;
  margin: 0 0 16px;
  line-height: 1.65;
  font-weight: 450;
}

.review-card strong {
  display: block;
  color: #0f172a;
}

.review-card span {
  color: #64748b;
  font-size: 0.9rem;
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

.loading-spinner,
.no-places {
  width: 100%;
  padding: 42px 20px;
  text-align: center;
  color: #64748b;
  font-size: 1rem;
  font-weight: 550;
}

@media (max-width: 1180px) {
  .category-card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .featured-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .explore-grid { grid-template-columns: 1fr; }
}

@media (max-width: 820px) {
  .hero {
    min-height: auto;
  }

  .hero-inner {
    padding-top: 56px;
    padding-bottom: 70px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .category-card-grid,
  .featured-grid,
  .offer-grid,
  .review-layout,
  .review-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .section-block {
    padding: 40px 0;
  }

  .hero-copy h1 {
    font-size: 2.35rem;
  }

  .category-card {
    min-height: 150px;
  }
}
</style>
