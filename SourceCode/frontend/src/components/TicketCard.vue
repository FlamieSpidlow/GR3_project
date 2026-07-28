<template>
  <article class="ticket-card">
    <div class="qr-box">
      <img v-if="qrImage" :src="qrImage" alt="Mã QR vé" />
      <QrCodeIcon v-else class="qr-placeholder" aria-hidden="true" />
    </div>
    <div class="ticket-info">
      <span class="ticket-type">{{ ticket.name || 'Vé tham quan' }}</span>
      <strong>{{ ticketCode(ticket) }}</strong>
      <StatusBadge :status="ticket.status" />
      <p v-if="visitDate">Hiệu lực ngày {{ visitDate }}</p>
    </div>
  </article>
</template>

<script>
import { QrCodeIcon } from '@heroicons/vue/24/outline'
import StatusBadge from './StatusBadge.vue'
import { ticketCode } from '../utils/displayLabels'

export default {
  name: 'TicketCard',
  components: { QrCodeIcon, StatusBadge },
  props: {
    ticket: { type: Object, required: true },
    qrImage: { type: String, default: '' },
    visitDate: { type: String, default: '' }
  },
  methods: { ticketCode }
}
</script>

<style scoped>
.ticket-card { display:grid; grid-template-columns:132px minmax(0,1fr); gap:16px; align-items:center; border:1px solid #e2e8f0; border-radius:12px; padding:14px; background:#fff; }
.qr-box { width:132px; aspect-ratio:1; display:grid; place-items:center; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; }
.qr-box img { width:116px; height:116px; object-fit:contain; }
.qr-placeholder { width:52px; height:52px; color:#94a3b8; }
.ticket-info { display:grid; gap:7px; min-width:0; }
.ticket-type { color:#64748b; font-size:.82rem; font-weight:800; }
strong { color:#0f172a; font-size:1.02rem; overflow-wrap:anywhere; }
p { margin:0; color:#64748b; font-size:.86rem; }
@media (max-width:520px) { .ticket-card { grid-template-columns:1fr; } .qr-box { width:100%; max-width:180px; } }
</style>
