<template>
  <button :type="type" :class="['action-button', `tone-${tone}`]" :disabled="disabled" :title="title" @click="$emit('click', $event)">
    <component v-if="icon" :is="icon" class="action-icon" aria-hidden="true" />
    <span v-if="$slots.default"><slot /></span>
  </button>
</template>

<script>
export default {
  name: 'ActionButton',
  props: {
    icon: { type: [String, Object], default: '' },
    tone: { type: String, default: 'default' },
    title: { type: String, default: '' },
    type: { type: String, default: 'button' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['click']
}
</script>

<style scoped>
.action-button {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  min-height:36px;
  border:1px solid #cbd5e1;
  border-radius:8px;
  padding:8px 11px;
  background:#fff;
  color:#334155;
  font-weight:800;
  cursor:pointer;
}
.action-button:disabled { opacity:.55; cursor:not-allowed; }
.action-icon { width:17px; height:17px; }
.tone-primary { background:#527392; color:#fff; border-color:#527392; }
.tone-danger { background:#fff; color:#991b1b; border-color:#fecaca; }
.tone-muted { background:#f8fafc; color:#475569; }
</style>
