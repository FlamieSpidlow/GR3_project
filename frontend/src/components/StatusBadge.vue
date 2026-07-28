<template>
  <span :class="['status-badge', toneClass]">
    {{ label || statusLabel(status) }}
  </span>
</template>

<script>
import { statusLabel, statusTone } from '../utils/displayLabels'

export default {
  name: 'StatusBadge',
  props: {
    status: { type: String, default: '' },
    label: { type: String, default: '' },
    tone: { type: String, default: '' }
  },
  computed: {
    resolvedTone() {
      return this.tone || statusTone(this.status)
    },
    toneClass() {
      return `status-${this.resolvedTone}`
    }
  },
  methods: { statusLabel }
}
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 130px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}
.status-success { background:#dcfce7; color:#166534; border-color:#86efac; }
.status-warning { background:#fef3c7; color:#92400e; border-color:#fcd34d; }
.status-danger { background:#fee2e2; color:#991b1b; border-color:#fecaca; }
.status-info { background:#e0f2fe; color:#075985; border-color:#7dd3fc; }
.status-neutral { background:#f1f5f9; color:#475569; border-color:#cbd5e1; }
</style>
