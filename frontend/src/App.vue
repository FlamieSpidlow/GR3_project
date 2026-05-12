<template>
  <div class="app-shell">
    <header class="app-header">
      <NavBar />
    </header>

    <main class="app-main">
      <router-view />
    </main>

    <ChatbotWidget />

    <AppFooter />
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue'
import AppFooter from './components/AppFooter.vue'
import ChatbotWidget from './components/ChatbotWidget.vue'

export default {
  name: 'App',
  components: { NavBar, AppFooter, ChatbotWidget }
}
</script>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  --chatbot-bottom-offset: 56px;
}

.app-header {
  flex: 0 0 auto;
}

.app-main {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
</style>