<template>
  <div class="about-page">
    <main class="site-main">
      <section class="page-hero">
        <div class="page-hero-inner tw-container-wide">
          <h1>Về chúng tôi</h1>
          <p>TheWeekend giúp bạn tìm khu vui chơi phù hợp cho bé.</p>
        </div>
      </section>

      <section class="page-body">
        <div class="tw-container-wide">
          <div class="tw-surface body-card">
            <h2 class="body-title">TheWeekend</h2>
            <p class="body-text tw-muted">TheWeekend giúp bạn tìm khu vui chơi phù hợp cho bé.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
}
</script>

<style scoped>
.about-page {
  background: var(--tw-bg);
  min-height: 100%;
}

.site-header {
  position: relative;
  z-index: 10;
}

.site-main {
  padding-bottom: 36px;
}

.page-hero {
  position: relative;
  padding: 60px 0 46px 0;
  overflow: hidden;
}

.page-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('~@/../public/Playground.jpg');
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
}

.page-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.72) 0%,
    rgba(15, 23, 42, 0.4) 60%,
    rgba(248, 250, 252, 1) 100%
  );
}

.page-hero-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  color: var(--tw-surface);
  max-width: 860px;
  margin: 0 auto;
}

.page-hero-inner h1 {
  margin: 0 0 12px 0;
  font-size: 2.25rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.page-hero-inner p {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.65;
  opacity: 0.9;
  font-weight: 500;
}

.page-body {
  padding: 28px 0 10px 0;
}

.body-card {
  padding: 20px;
}

.body-title {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.body-text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
}

.site-footer {
  padding: 26px 0;
  text-align: center;
  color: var(--tw-muted);
}
</style>
