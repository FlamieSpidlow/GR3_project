<template>
  <section class="admin-page-header">
    <div>
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script>
export default {
  name: 'AdminPageHeader',
  props: {
    eyebrow: { type: String, default: '' },
    title: { type: String, required: true },
    description: { type: String, default: '' }
  }
}
</script>

<style scoped>
.admin-page-header {
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:18px;
  margin-bottom:20px;
}
.eyebrow {
  margin:0 0 6px;
  color:#64748b;
  font-size:0.78rem;
  font-weight:850;
  text-transform:uppercase;
}
h1 {
  margin:0;
  color:#0f172a;
  font-size:1.8rem;
  line-height:1.2;
  letter-spacing:0;
}
.description {
  margin:8px 0 0;
  color:#64748b;
  font-size:1rem;
  line-height:1.5;
}
.actions { flex:0 0 auto; }
@media (max-width: 720px) {
  .admin-page-header { flex-direction:column; }
  .actions { width:100%; }
}
</style>
