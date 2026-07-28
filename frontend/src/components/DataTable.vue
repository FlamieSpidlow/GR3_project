<template>
  <div class="data-table-wrap">
    <table class="data-table">
      <slot />
    </table>
  </div>
</template>

<script>
export default { name: 'DataTable' }
</script>

<style scoped>
.data-table-wrap { overflow-x:auto; background:#fff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
.data-table { width:100%; min-width:900px; border-collapse:collapse; }
.data-table :deep(th),
.data-table :deep(td) { padding:13px 14px; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; }
.data-table :deep(th) { background:#f8fafc; color:#475569; font-size:.76rem; font-weight:850; text-transform:uppercase; }
.data-table :deep(tr:last-child td) { border-bottom:0; }
</style>
