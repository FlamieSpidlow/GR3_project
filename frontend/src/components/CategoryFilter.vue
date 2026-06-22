<template>
  <section class="category-filter" aria-labelledby="category-filter-title">
    <div class="filter-heading">
      <h2 id="category-filter-title">Phân loại địa điểm</h2>
      <span>{{ totalCount }} địa điểm</span>
    </div>

    <div v-if="categories.length" class="category-scroll" aria-label="Phân loại địa điểm">
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        :class="['category-pill', { active: activeCategory === category.id }]"
        @click="$emit('category-change', category.id)"
      >
        <span class="category-name">{{ category.label }}</span>
        <span class="category-count">{{ category.count || 0 }}</span>
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
  emits: ['category-change']
}
</script>

<style scoped>
.category-filter {
  margin-bottom: 22px;
}

.filter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.filter-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.35rem;
  line-height: 1.3;
  font-weight: 850;
  letter-spacing: 0;
}

.filter-heading span {
  color: #64748b;
  font-size: 0.96rem;
  font-weight: 800;
  white-space: nowrap;
}

.category-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-pill {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  border-radius: 999px;
  min-height: 42px;
  padding: 9px 14px 9px 16px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 850;
  font-size: 0.94rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.category-pill:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #111827;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.category-pill.active {
  background: linear-gradient(135deg, #635bff 0%, #22a6f2 100%);
  border-color: transparent;
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(99, 91, 255, 0.26);
}

.category-name {
  white-space: nowrap;
}

.category-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1;
}

.category-pill.active .category-count {
  background: rgba(255, 255, 255, 0.24);
  color: #ffffff;
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
    font-size: 1.18rem;
  }

  .category-scroll {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 2px 2px 10px;
    margin: 0 -2px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .category-scroll::-webkit-scrollbar {
    height: 0;
  }

  .category-pill {
    flex: 0 0 auto;
    scroll-snap-align: start;
    min-height: 40px;
    padding: 8px 12px 8px 14px;
    font-size: 0.9rem;
  }
}
</style>
