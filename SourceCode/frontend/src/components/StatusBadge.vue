<template>
  <span :class="['status-badge', toneClass]">
    <component :is="icon" class="status-icon" aria-hidden="true" />
    {{ label || statusLabel(status) }}
  </span>
</template>

<script>
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { statusLabel, statusTone } from '../utils/displayLabels'

export default {
  name: 'StatusBadge',
  components: { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon },
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
    },
    icon() {
      const icons = {
        success: 'CheckCircleIcon',
        warning: 'ClockIcon',
        danger: 'XCircleIcon',
        info: 'InformationCircleIcon',
        neutral: 'ExclamationTriangleIcon'
      }
      return icons[this.resolvedTone] || icons.neutral
    }
  },
  methods: { statusLabel }
}
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}
.status-icon { width: 15px; height: 15px; }
.status-success { background:#dcfce7; color:#166534; border-color:#86efac; }
.status-warning { background:#fef3c7; color:#92400e; border-color:#fcd34d; }
.status-danger { background:#fee2e2; color:#991b1b; border-color:#fecaca; }
.status-info { background:#e0f2fe; color:#075985; border-color:#7dd3fc; }
.status-neutral { background:#f1f5f9; color:#475569; border-color:#cbd5e1; }
</style>
