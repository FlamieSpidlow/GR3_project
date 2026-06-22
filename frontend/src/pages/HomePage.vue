<template>
  <div class="home-page">
    <main id="main" class="site-main">
      <section class="hero">
        <div class="hero-bg" aria-hidden="true"></div>
        <div class="hero-inner tw-container-wide">
          <div class="hero-copy">
            <span class="hero-kicker">TheWeekend</span>
            <h1>Chọn điểm vui chơi cuối tuần cho cả gia đình</h1>
            <p>
              Khám phá khu vui chơi, công viên, bảo tàng và trải nghiệm ngoài trời phù hợp cho trẻ em.
            </p>
          </div>

          <form class="hero-search" @submit.prevent="submitSearch">
            <div class="search-field search-field-main">
              <span class="field-icon" aria-hidden="true">⌕</span>
              <div>
                <label>Tìm kiếm địa điểm</label>
                <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="Nhập công viên, khu vui chơi, bảo tàng..."
                />
              </div>
            </div>
            <div class="search-field">
              <span class="field-icon" aria-hidden="true">⌁</span>
              <div>
                <label>Gợi ý nhanh</label>
                <select v-model="quickCategory">
                  <option value="">Tất cả danh mục</option>
                  <option v-for="category in categories" :key="category._id || category.id" :value="category.name">
                    {{ category.name }}
                  </option>
                </select>
              </div>
            </div>
            <button type="submit" class="search-button">Tìm ngay</button>
          </form>

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
              <h2>Danh mục địa điểm</h2>
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
              <h2>Gợi ý được gia đình yêu thích</h2>
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
            <p>Chưa có địa điểm phù hợp với danh mục đã chọn.</p>
          </div>
        </div>
      </section>

      <section class="section-block explore-section">
        <div class="tw-container-wide">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">Khu vực khám phá</span>
              <h2>Lên lịch cho từng kiểu cuối tuần</h2>
            </div>
          </div>

          <div class="explore-grid">
            <article v-for="area in exploreAreas" :key="area.title" class="explore-card">
              <img :src="area.image" :alt="area.title" />
              <div>
                <span>{{ area.badge }}</span>
                <h3>{{ area.title }}</h3>
                <p>{{ area.description }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section-block offers-section">
        <div class="tw-container-wide">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">Ưu đãi & sự kiện</span>
              <h2>Hoạt động mới cho gia đình</h2>
            </div>
          </div>

          <div class="offer-grid">
            <article v-for="offer in offers" :key="offer.title" class="offer-card">
              <span>{{ offer.date }}</span>
              <h3>{{ offer.title }}</h3>
              <p>{{ offer.description }}</p>
              <router-link :to="offer.to">Khám phá -&gt;</router-link>
            </article>
          </div>
        </div>
      </section>

      <section class="section-block review-section">
        <div class="tw-container-wide review-layout">
          <div class="review-copy">
            <span class="section-eyebrow">Trải nghiệm thật</span>
            <h2>Phụ huynh nói gì về TheWeekend</h2>
            <p>
              Tìm nơi vui chơi không còn là một buổi tối lướt mãi không xong. TheWeekend gom địa điểm, lọc theo nhu cầu và giúp gia đình chọn nhanh hơn.
            </p>
          </div>
          <div class="review-grid">
            <article v-for="review in reviews" :key="review.name" class="review-card">
              <div class="stars">★★★★★</div>
              <p>“{{ review.content }}”</p>
              <strong>{{ review.name }}</strong>
              <span>{{ review.role }}</span>
            </article>
          </div>
        </div>
      </section>
    </main>

    <footer class="home-footer">
      <div class="tw-container-wide footer-inner">
        <div>
          <strong>TheWeekend</strong>
          <p>Nền tảng gợi ý khu vui chơi cho trẻ em và gia đình.</p>
        </div>
        <nav aria-label="Liên kết cuối trang">
          <router-link to="/places">Địa điểm</router-link>
          <router-link to="/suggest">Gợi ý</router-link>
          <router-link to="/favour">Yêu thích</router-link>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script>
import PlaceCard from '../components/PlaceCard.vue'
import { getAllPlaces } from '../api/places'
import { getCategories } from '../api/categories'
import { getCategoryId, getCategoryLabel, normalizeText } from '../utils/placeFilters'

const fallbackImage = '/Playground.jpg'

export default {
  name: 'HomePage',
  components: { PlaceCard },
  data() {
    return {
      allPlaces: [],
      categories: [],
      activeCategory: 'all',
      searchQuery: '',
      quickCategory: '',
      errorMessage: '',
      locationLoading: true,
      offers: [
        {
          date: 'Cuối tuần này',
          title: 'Checklist vui chơi trong nhà khi trời mưa',
          description: 'Gợi ý các địa điểm có khu vận động, trò chơi sáng tạo và tiện ích cho phụ huynh.',
          to: '/search?query=khu%20vui%20ch%C6%A1i%20trong%20nh%C3%A0'
        },
        {
          date: 'Mùa hè',
          title: 'Ngày năng động cùng công viên nước',
          description: 'Chọn điểm vui chơi nước phù hợp độ tuổi, có khu nghỉ và dịch vụ ăn uống gần đó.',
          to: '/search?query=c%C3%B4ng%20vi%C3%AAn%20n%C6%B0%E1%BB%9Bc'
        },
        {
          date: 'Gia đình',
          title: 'Lịch trình nửa ngày cho bé thích khám phá',
          description: 'Kết hợp bảo tàng, không gian xanh và quán ăn gần địa điểm để chuyến đi nhẹ nhàng hơn.',
          to: '/places'
        }
      ],
      reviews: [
        {
          name: 'Minh Anh',
          role: 'Phụ huynh bé 5 tuổi',
          content: 'Mình tìm được khu vui chơi phù hợp tuổi của bé nhanh hơn, có ảnh và thông tin giá rất tiện.'
        },
        {
          name: 'Gia Huy',
          role: 'Gia đình cuối tuần',
          content: 'Các danh mục rõ ràng, dễ chọn giữa công viên, trong nhà và bảo tàng cho từng buổi đi chơi.'
        }
      ]
    }
  },
  computed: {
    heroStats() {
      return [
        { value: `${this.allPlaces.length || 0}+`, label: 'địa điểm' },
        { value: `${this.categories.length || 0}`, label: 'danh mục' },
        { value: '4.8/5', label: 'trải nghiệm' }
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

      const allCard = {
        id: 'all',
        label: 'Tất cả',
        count: this.allPlaces.length,
        image: this.getCategoryImage()
      }

      const cards = this.categories.map(category => {
        const id = getCategoryId(category)
        const label = getCategoryLabel(category)
        return {
          id,
          label,
          count: countsById[id] || countsByName[normalizeText(label)] || 0,
          image: this.getCategoryImage(id, label)
        }
      }).filter(category => category.id && category.label)

      return [allCard, ...cards]
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
      const images = this.featuredPlaces.length ? this.featuredPlaces : this.allPlaces
      return [
        {
          badge: 'Trong nhà',
          title: 'Vui chơi không phụ thuộc thời tiết',
          description: 'Nhà bóng, trò chơi vận động, workshop sáng tạo và khu giải trí trong trung tâm thương mại.',
          image: this.getPlaceImage(images[0])
        },
        {
          badge: 'Ngoài trời',
          title: 'Một ngày xanh cho cả nhà',
          description: 'Công viên, vườn sinh thái và điểm dã ngoại có nhiều không gian để bé vận động.',
          image: this.getPlaceImage(images[1])
        },
        {
          badge: 'Học mà chơi',
          title: 'Bảo tàng và trải nghiệm khám phá',
          description: 'Các điểm đến giúp bé quan sát, đặt câu hỏi và học thêm qua trải nghiệm thực tế.',
          image: this.getPlaceImage(images[2])
        }
      ]
    }
  },
  mounted() {
    this.loadHomeData()
  },
  methods: {
    async loadHomeData() {
      this.locationLoading = true
      this.errorMessage = ''

      const [placeRes, categoryRes] = await Promise.all([
        getAllPlaces({ force: true }),
        getCategories()
      ])

      if (categoryRes && categoryRes.success) {
        this.categories = categoryRes.data || []
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
    submitSearch() {
      const term = [this.searchQuery, this.quickCategory].map(v => String(v || '').trim()).filter(Boolean).join(' ')
      this.$router.push({
        path: '/search',
        query: term ? { query: term } : {}
      })
    },
    selectCategory(categoryId) {
      this.activeCategory = categoryId
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
    }
  }
}
</script>

<style scoped>
.home-page {
  background: #f7fbff;
  color: #0f172a;
  min-height: 100%;
  overflow-x: hidden;
}

.site-main {
  padding-bottom: 0;
}

.hero {
  position: relative;
  min-height: 640px;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(90deg, rgba(7, 20, 46, 0.78) 0%, rgba(7, 20, 46, 0.42) 48%, rgba(7, 20, 46, 0.18) 100%),
    url('~@/../public/Playground.jpg');
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 180px;
  background: linear-gradient(180deg, rgba(247, 251, 255, 0) 0%, #f7fbff 82%);
}

.hero-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  padding-top: 86px;
  padding-bottom: 92px;
}

.hero-copy {
  max-width: 720px;
  color: #ffffff;
}

.hero-kicker,
.section-eyebrow {
  display: inline-flex;
  align-items: center;
  color: #0284c7;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.12em;
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
  font-weight: 950;
  letter-spacing: 0;
  max-width: 850px;
}

.hero-copy p {
  max-width: 610px;
  margin: 22px 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.12rem;
  line-height: 1.7;
  font-weight: 600;
}

.hero-search {
  width: min(1120px, 100%);
  margin-top: 44px;
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.6fr) auto;
  gap: 10px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
}

.search-field {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.field-icon {
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #0369a1;
  background: #e0f2fe;
  font-weight: 900;
  font-size: 1.15rem;
}

.search-field div {
  min-width: 0;
  flex: 1;
}

.search-field label {
  display: block;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 850;
  margin-bottom: 4px;
}

.search-field input,
.search-field select {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-weight: 850;
}

.search-field input::placeholder {
  color: #94a3b8;
}

.search-button {
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  color: #ffffff;
  padding: 0 28px;
  min-height: 68px;
  cursor: pointer;
  font-weight: 950;
  font-size: 1rem;
  box-shadow: 0 18px 34px rgba(239, 68, 68, 0.25);
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.stat-item {
  min-width: 128px;
  padding: 14px 16px;
  border-radius: 8px;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
}

.stat-item strong {
  display: block;
  font-size: 1.3rem;
  line-height: 1.1;
}

.stat-item span {
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.85rem;
  font-weight: 700;
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
  font-weight: 950;
  letter-spacing: 0;
}

.text-link {
  color: #0369a1;
  text-decoration: none;
  font-weight: 900;
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
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
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
  transform: scale(1.05);
}

.category-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.82) 100%);
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
  font-weight: 950;
}

.category-content small {
  display: inline-flex;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 800;
}

.category-card.active {
  outline: 4px solid #38bdf8;
  outline-offset: 0;
}

.featured-section {
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
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.explore-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.82) 100%);
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
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 0.78rem;
  font-weight: 900;
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
  font-weight: 600;
}

.offers-section {
  background: linear-gradient(180deg, #e0f2fe 0%, #f7fbff 100%);
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
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.offer-card {
  padding: 24px;
}

.offer-card span {
  color: #ea580c;
  font-size: 0.82rem;
  font-weight: 950;
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
  font-weight: 600;
}

.offer-card a {
  color: #0369a1;
  text-decoration: none;
  font-weight: 950;
}

.review-section {
  background: #ffffff;
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
  font-weight: 600;
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
  font-weight: 650;
}

.review-card strong {
  display: block;
  color: #0f172a;
}

.review-card span {
  color: #64748b;
  font-size: 0.9rem;
}

.home-footer {
  background: #0f172a;
  color: #ffffff;
  padding: 26px 0;
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.footer-inner strong {
  display: block;
  font-size: 1.25rem;
}

.footer-inner p {
  margin: 4px 0 0;
  color: #cbd5e1;
}

.footer-inner nav {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.footer-inner a {
  color: #e0f2fe;
  text-decoration: none;
  font-weight: 800;
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
  font-weight: 700;
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

  .hero-search {
    grid-template-columns: 1fr;
  }

  .search-button {
    min-height: 54px;
  }

  .section-heading,
  .footer-inner {
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

  .search-field {
    align-items: flex-start;
  }

  .category-card {
    min-height: 150px;
  }
}
</style>
