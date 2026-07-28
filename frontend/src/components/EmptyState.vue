<template>
  <div class="empty-state">
    <component :is="icon" class="empty-icon" aria-hidden="true" />
    <h3>{{ title }}</h3>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>

<script>
import { InboxIcon } from '@heroicons/vue/24/outline'

export default {
  name: 'EmptyState',
  components: { InboxIcon },
  props: {
    title: { type: String, default: 'Chưa có dữ liệu' },
    message: { type: String, default: '' },
    icon: { type: String, default: 'InboxIcon' }
  }
}
</script>

<style scoped>
.empty-state {
  display:flex;
  min-height:180px;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:28px;
  border:1px dashed #cbd5e1;
  border-radius:12px;
  background:#f8fafc;
  color:#64748b;
  text-align:center;
}
.empty-icon { width:36px; height:36px; color:#94a3b8; }
h3 { margin:0; color:#0f172a; font-size:1rem; }
p { margin:0; max-width:520px; line-height:1.5; }
</style>
