<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <section class="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title">
      <button type="button" class="close-btn" aria-label="Dong" @click="$emit('close')">x</button>
      <header class="modal-head">
        <div>
          <p>Danh sách vé</p>
          <h2 id="ticket-modal-title">{{ bookingTitle }}</h2>
        </div>
        <StatusBadge :status="booking?.status" />
      </header>

      <div v-if="tickets.length === 0" class="empty-box">Chưa có vé điện tử.</div>

      <div v-else class="ticket-list">
        <article v-for="ticket in tickets" :key="ticket._id || ticket.code" class="ticket-row">
          <div class="qr-box">
            <img v-if="qrImages[ticket.code]" :src="qrImages[ticket.code]" alt="Mã QR vé" />
            <QrCodeIcon v-else class="qr-icon" aria-hidden="true" />
          </div>
          <div class="ticket-info">
            <span>{{ ticket.name || 'Vé tham quan' }}</span>
            <strong>{{ ticketCode(ticket) }}</strong>
            <StatusBadge :status="ticket.status" />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import { QrCodeIcon } from '@heroicons/vue/24/outline'
import StatusBadge from './StatusBadge.vue'
import { ticketCode } from '../utils/displayLabels'

export default {
  name: 'TicketListModal',
  components: { QrCodeIcon, StatusBadge },
  props: {
    booking: { type: Object, default: null },
    qrImages: { type: Object, default: () => ({}) }
  },
  emits: ['close'],
  computed: {
    tickets() {
      return this.booking?.tickets || []
    },
    bookingTitle() {
      return this.booking?.place?.name || 'Đơn đặt vé'
    }
  },
  methods: { ticketCode }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.62);
}
.ticket-modal {
  position: relative;
  width: min(680px, 100%);
  max-height: calc(100vh - 40px);
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  padding: 22px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 34px;
  height: 34px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-weight: 900;
  cursor: pointer;
}
.modal-head { display:flex; justify-content:space-between; gap:16px; margin:4px 42px 18px 0; }
.modal-head p { margin:0 0 5px; color:#64748b; font-size:.8rem; font-weight:850; text-transform:uppercase; }
.modal-head h2 { margin:0; color:#0f172a; font-size:1.25rem; }
.empty-box { border:1px dashed #cbd5e1; border-radius:12px; padding:18px; color:#64748b; text-align:center; }
.ticket-list { display:grid; gap:12px; }
.ticket-row { display:grid; grid-template-columns:112px minmax(0,1fr); gap:14px; align-items:center; border:1px solid #e2e8f0; border-radius:12px; padding:12px; }
.qr-box { width:112px; aspect-ratio:1; display:grid; place-items:center; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; }
.qr-box img { width:96px; height:96px; object-fit:contain; }
.qr-icon { width:44px; height:44px; color:#94a3b8; }
.ticket-info { display:grid; gap:7px; min-width:0; }
.ticket-info span { color:#64748b; font-size:.82rem; font-weight:800; }
.ticket-info strong { color:#0f172a; overflow-wrap:anywhere; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
@media (max-width:520px) {
  .ticket-row { grid-template-columns:1fr; }
}
</style>
