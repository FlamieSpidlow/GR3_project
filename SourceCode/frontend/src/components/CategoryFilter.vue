<template>
  <section class="category-filter" aria-labelledby="category-filter-title">
    <div class="filter-heading">
      <h2 id="category-filter-title">Phân loại địa điểm</h2>
      <span>{{ totalCount }} địa điểm</span>
    </div>

    <div v-if="categories.length" class="category-row" aria-label="Phân loại địa điểm">
      <button
        v-if="allCategory"
        type="button"
        :class="['category-pill', 'fixed-pill', { active: activeCategory === allCategory.id }]"
        @click="$emit('category-change', allCategory.id)"
      >
        <span class="category-name">{{ allCategory.label }}</span>
        <span class="category-count">{{ allCategory.count || 0 }}</span>
      </button>

      <button type="button" class="nav-btn" :disabled="!canMovePrev" aria-label="Danh mục trước" @click="move(-1)">
        ‹
      </button>

      <div class="category-window">
        <div class="category-track">
          <button
            v-for="category in visibleSlidingCategories"
            :key="category.id"
            type="button"
            :class="['category-pill', { active: activeCategory === category.id }]"
            @click="$emit('category-change', category.id)"
          >
            <span class="category-name">{{ category.label }}</span>
            <span class="category-count">{{ category.count || 0 }}</span>
          </button>
        </div>
      </div>

      <button type="button" class="nav-btn" :disabled="!canMoveNext" aria-label="Danh mục sau" @click="move(1)">
        ›
      </button>
    </div>

    <div v-else class="category-loading">Đang tải danh mục...</div>
  </section>
</template>

<script>
export default {
  name: 'CategoryFilter',
  props: {
    categories: {
      type: Array,
      default: () => []
    },
    activeCategory: {
      type: String,
      default: 'all'
    },
    totalCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['category-change'],
  data() {
    return {
      slideIndex: 0,
      visibleCount: 5
    }
  },
  computed: {
    allCategory() {
      return this.categories.find(category => category.id === 'all') || null
    },
    slidingCategories() {
      return this.categories.filter(category => category.id !== 'all')
    },
    visibleSlidingCategories() {
      return this.slidingCategories.slice(this.slideIndex, this.slideIndex + this.visibleCount)
    },
    maxSlideIndex() {
      return Math.max(0, this.slidingCategories.length - this.visibleCount)
    },
    canMovePrev() {
      return this.slideIndex > 0
    },
    canMoveNext() {
      return this.slideIndex < this.maxSlideIndex
    }
  },
  watch: {
    categories() {
      if (this.slideIndex > this.maxSlideIndex) this.slideIndex = this.maxSlideIndex
      this.ensureActiveVisible()
    },
    activeCategory() {
      this.ensureActiveVisible()
    }
  },
  methods: {
    move(direction) {
      const next = this.slideIndex + direction
      this.slideIndex = Math.max(0, Math.min(this.maxSlideIndex, next))
    },
    ensureActiveVisible() {
      if (!this.activeCategory || this.activeCategory === 'all') return
      const index = this.slidingCategories.findIndex(category => category.id === this.activeCategory)
      if (index < 0) return
      if (index < this.slideIndex) {
        this.slideIndex = index
      } else if (index >= this.slideIndex + this.visibleCount) {
        this.slideIndex = Math.min(this.maxSlideIndex, index - this.visibleCount + 1)
      }
    }
  }
}
</script>

<style scoped>
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
  color: #0f172a;
  font-size: 1.18rem;
  line-height: 1.3;
  font-weight: 650;
  letter-spacing: 0;
}

.filter-heading span {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 550;
  white-space: nowrap;
}

.category-row {
  display: grid;
  grid-template-columns: max-content 36px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.category-window {
  flex: 1;
  min-width: 0;
}

.category-track {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  column-gap: 8px;
  min-width: 0;
}

.category-pill {
  min-width: 0;
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #374151;
  border-radius: 8px;
  min-height: 40px;
  padding: 7px 9px 7px 11px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 560;
  font-size: 0.84rem;
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-shadow: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.fixed-pill {
  width: auto;
  min-width: 116px;
}

.category-pill:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

.category-pill.active {
  background: #eef4f8;
  border-color: #9eb3c5;
  color: #334e68;
  box-shadow: none;
}

.category-name {
  min-width: 0;
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.category-count {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.category-pill.active .category-count {
  background: #ffffff;
  color: #4f6f8f;
}

.nav-btn {
  width: 36px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #111827;
}

.nav-btn:disabled {
  opacity: 0.38;
  cursor: default;
}

.category-loading {
  min-height: 42px;
  display: flex;
  align-items: center;
  color: #64748b;
  font-weight: 750;
}

@media (max-width: 640px) {
  .filter-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .filter-heading h2 {
    font-size: 1.08rem;
  }

  .category-row {
    display: flex;
    align-items: stretch;
  }

  .category-window {
    flex: 1;
    overflow-x: auto;
    width: auto;
    padding-bottom: 8px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .category-window::-webkit-scrollbar {
    height: 0;
  }

  .category-track {
    display: flex;
    gap: 8px;
  }

  .category-pill {
    flex: 0 0 170px;
    scroll-snap-align: start;
    min-height: 36px;
    font-size: 0.84rem;
  }

  .fixed-pill {
    flex: 0 0 auto;
    min-width: 92px;
  }

  .nav-btn {
    display: none;
  }
}
</style>
