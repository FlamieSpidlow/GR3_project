<template>
  <div class="card" @click="$emit('select', place)">
    <div class="card-media">
      <img :src="getImageUrl(place.images && place.images[0] ? place.images[0] : place.image)" alt="Hình ảnh địa điểm" />
      <button 
        v-if="showFavorite"
        class="favorite-btn" 
        :class="{ active: isFavorited }" 
        @click.stop="toggleFavorite"
        :title="isFavorited ? 'Bỏ yêu thích' : 'Thêm yêu thích'"
      >
        <svg class="favorite-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
    <div class="card-body">
      <h3 class="card-title">{{ extractPlaceName(place.name) }}</h3>
      <p v-if="showAddress" class="card-address">{{ cleanAddress(place.address, place.name) || 'Địa chỉ không rõ' }}</p>
      
      <div class="place-tags" v-if="showTags && place.tags && place.tags.length > 0">
        <span v-for="tag in place.tags.slice(0, 4)" :key="tag" class="tag">{{ tag }}</span>
      </div>
      
      <div class="meta-row">
        <span v-if="getRating(place) > 0" class="rating-meta">
          <span class="rating-star">★</span>
          <span>{{ getRating(place) }}/5</span>
        </span>
        <span v-else class="no-rating">Chưa có đánh giá</span>
        <span>👶 {{ place.ageRange || '0-12' }} tuổi</span>
        <span>Giá: {{ formatPrice(place.price) }}</span>
      </div>
      
      <div v-if="getDistance(place) !== null" class="distance-row">
        Cách bạn khoảng {{ (getDistance(place) / 1000).toFixed(1) }} km
      </div>

      <button v-if="showButton" class="btn" @click.stop="$emit('select', place)">Xem chi tiết</button>
    </div>
  </div>
</template>

<script>
import { formatPrice } from '../utils/priceFormatter'
import { cleanAddress } from '../utils/addressFormatter'
import { assetUrl } from '../utils/apiBase'
import { updateFavorite } from '../api/auth'
import { getAuthToken, getAuthUserRaw } from '../utils/authSession'
import { loadNotifications } from '../utils/notifications'

export default {
  name: 'PlaceCard',
  props: {
    place: { type: Object, required: true },
    showMeta: { type: Boolean, default: true },
    showFavorite: { type: Boolean, default: true },
    showAddress: { type: Boolean, default: true },
    showTags: { type: Boolean, default: false },
    showButton: { type: Boolean, default: true },
    favorited: { type: Boolean, default: false }
  },
  data() {
    return {
      localFavorited: this.favorited
    }
  },
  computed: {
    isFavorited() {
      return this.localFavorited
    }
  },
  watch: {
    favorited(newVal) {
      this.localFavorited = newVal
    }
  },
  mounted() {
    this.checkFavorite()
  },
  methods: {
    readFavorites() {
      try {
        const raw = getAuthUserRaw()
        if (raw) {
          const user = JSON.parse(raw)
          if (Array.isArray(user.favorites)) return user.favorites
        }
      } catch {
        // ignore
      }
      return []
    },
    writeFavorites(favorites) {
      try {
        const raw = getAuthUserRaw()
        if (!raw) return
        const user = JSON.parse(raw)
        const nextUser = { ...user, favorites }
        if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(nextUser))
      } catch {
        // ignore
      }
    },
    checkFavorite() {
      const favorites = this.readFavorites()
      const placeId = this.place._id || this.place.id
      this.localFavorited = favorites.includes(placeId)
    },
    async toggleFavorite() {
      if (!getAuthToken()) {
        this.$emit('favorite-login-required')
        return
      }

      const placeId = this.place._id || this.place.id
      let favorites = this.readFavorites()
      const nextFavorited = !this.localFavorited
      const previousFavorited = this.localFavorited
      
      if (!nextFavorited) {
        favorites = favorites.filter(id => id !== placeId)
      } else {
        if (!favorites.includes(placeId)) {
          favorites.push(placeId)
        }
      }
      
      this.localFavorited = nextFavorited
      this.writeFavorites(favorites)
      this.$emit('favorite-toggle', { id: placeId, favorited: nextFavorited, favorites })

      try {
        const res = await updateFavorite(placeId, nextFavorited)
        if (!res.success) throw new Error(res.error || 'Update favorite failed')
        const serverFavorites = Array.isArray(res.favorites) ? res.favorites : favorites
        this.writeFavorites(serverFavorites)
        this.$emit('favorite-toggle', { id: placeId, favorited: nextFavorited, favorites: serverFavorites })
        loadNotifications()
      } catch (err) {
        console.error('Error syncing favorite:', err)
        this.localFavorited = previousFavorited
        const rollbackFavorites = previousFavorited
          ? Array.from(new Set([...this.readFavorites(), placeId]))
          : this.readFavorites().filter(id => id !== placeId)
        this.writeFavorites(rollbackFavorites)
        this.$emit('favorite-toggle', { id: placeId, favorited: previousFavorited, favorites: rollbackFavorites })
      }
    },
    extractPlaceName(name) {
      if (!name) return '';
      const parts = name.split(',');
      return parts[0].trim();
    },
    getRating(place) {
      return place.averageRating || place.rating || 0
    },
    getDistance(place) {
      if (place.distance !== null && place.distance !== undefined) {
        return place.distance
      }
      return null
    },
    formatPrice,
    cleanAddress,
    getImageUrl(imagePath) {
      if (!imagePath) return '/Playground.jpg'
      return assetUrl(imagePath)
    }
  }
}
</script>

<style scoped>
.card {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--tw-surface);
  border: 1px solid var(--tw-border);
  border-radius: var(--tw-radius-md);
  overflow: hidden;
  box-shadow: var(--tw-shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
}

.card:hover { 
  box-shadow: var(--tw-shadow-md);
  transform: translateY(-4px); 
  border-color: var(--tw-primary);
}

.card-media {
  width: 100%;
  height: 220px;
  overflow: hidden;
  position: relative;
}

.card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.favorite-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--tw-border);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tw-muted);
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.favorite-btn:hover {
  transform: scale(1.1);
  background: #fff;
}

.favorite-btn.active {
  background: #fff;
  color: var(--tw-danger);
}

.favorite-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.favorite-icon path {
  fill: none;
}

.favorite-btn.active .favorite-icon path {
  fill: currentColor;
}

.card-body { 
  padding: 16px;
  flex: 1; 
  display: flex; 
  flex-direction: column;
}

.card-title {
  font-weight: 700;
  font-size: 1rem;
  margin: 0 0 6px 0;
  color: var(--tw-text);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-address {
  font-size: 0.88rem;
  color: var(--tw-muted);
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.place-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
}

.place-tags .tag {
  font-size: 0.72rem;
  padding: 2px 8px;
  background: var(--tw-bg);
  border: 1px solid var(--tw-border);
  color: var(--tw-primary-700);
  border-radius: 10px;
  font-weight: 500;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.88rem;
  color: var(--tw-muted);
  margin-bottom: 8px;
}

.rating-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.rating-star {
  color: #f59e0b;
}

.meta-row .no-rating {
  color: #9ca3af;
  font-style: italic;
}

.distance-row {
  color: #059669;
  font-weight: 600;
  font-size: 0.88rem;
  margin-bottom: 10px;
}


.btn {
  background: var(--tw-primary);
  color: #fff;
  border: none;
  padding: 10px 12px;
  border-radius: 8px;
  width: 100%;
  margin-top: auto;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  text-align: center;
  text-decoration: none;
  font-family: inherit;
  font-size: 0.95rem;
}

.btn:hover {
  background: var(--tw-primary-600);
}

@media (max-width: 480px) {
  .card-media { height: 180px; }
  .card-title { font-size: 0.95rem; }
}
</style>
