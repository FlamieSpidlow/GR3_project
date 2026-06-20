<template>
  <div class="tw-chatbot" :class="{ 'is-open': isOpen }">
    <button
      type="button"
      class="tw-chatbot__fab"
      @click="toggleOpen"
      :aria-label="isOpen ? 'Đóng chatbot' : 'Mở chatbot'"
      :title="isOpen ? 'Đóng chatbot' : 'Mở chatbot'"
    >
      <span class="tw-chatbot__fab-ring"></span>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="tw-chatbot__fab-icon">
        <path
          d="M4 5.5C4 4.12 5.12 3 6.5 3h11C19.88 3 21 4.12 21 5.5v7C21 13.88 19.88 15 18.5 15H8l-4 4v-4.5H6.5C5.12 14.5 4 13.38 4 12V5.5z"
          fill="currentColor"
        />
      </svg>
    </button>

    <transition name="tw-chatbot-slide">
      <section
        v-if="isOpen"
        class="tw-chatbot__panel"
        role="dialog"
        aria-label="Chatbot hỗ trợ"
      >
        <header class="tw-chatbot__header">
          <div class="tw-chatbot__title">
            <span class="tw-chatbot__title-label">Chatbot hỗ trợ</span>
            <span class="tw-chatbot__subtitle">Hỗ trợ tư vấn địa điểm</span>
          </div>
          <button type="button" class="tw-chatbot__close" @click="toggleOpen">x</button>
        </header>

        <div class="tw-chatbot__body" ref="bodyRef">
          <div v-if="messages.length === 0" class="tw-chatbot__empty">
            <h4>Hỏi về địa điểm phù hợp</h4>
            <p>Bạn có thể hỏi về địa điểm, hoạt động hoặc tiện ích phù hợp.</p>
            <div class="tw-chatbot__chips">
              <button type="button" class="tw-chatbot__chip" @click="useSuggestion('Địa điểm nào có tag Picnic?')">
                Địa điểm có tag Picnic
              </button>
              <button type="button" class="tw-chatbot__chip" @click="useSuggestion('Có địa điểm nào gần Hà Nội?')">
                Địa điểm gần Hà Nội
              </button>
              <button type="button" class="tw-chatbot__chip" @click="useSuggestion('Mô tả về địa điểm có tên (tên địa điểm)')">
                Mô tả địa điểm
              </button>
            </div>
          </div>

          <div class="tw-chatbot__messages" v-else>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="tw-chatbot__msg"
              :class="msg.role === 'user' ? 'tw-chatbot__msg--user' : 'tw-chatbot__msg--bot'"
            >
              <div class="tw-chatbot__bubble">
                <div>{{ msg.text }}</div>
                <div v-if="msg.role === 'assistant' && msg.places && msg.places.length" class="tw-chatbot__links">
                  <router-link
                    v-for="place in msg.places"
                    :key="place.id"
                    class="tw-chatbot__place-link"
                    :to="place.path"
                    @click="isOpen = false"
                  >
                    Xem {{ place.name }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isLoading" class="tw-chatbot__typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <form class="tw-chatbot__composer" @submit.prevent="sendMessage">
          <textarea
            ref="inputRef"
            v-model="draft"
            class="tw-chatbot__input"
            placeholder="Nhập câu hỏi..."
            rows="2"
            @keydown="handleKeydown"
          ></textarea>
          <button type="submit" class="tw-chatbot__send" :disabled="isLoading || !draft.trim()">
            Gửi
          </button>
        </form>
      </section>
    </transition>
  </div>
</template>

<script>
import { askChatbot } from '../api/chatbot'

const NO_DATA_RESPONSE = 'Không có dữ liệu'

export default {
  name: 'ChatbotWidget',
  data() {
    return {
      isOpen: false,
      isLoading: false,
      draft: '',
      messages: []
    }
  },
  methods: {
    toggleOpen() {
      this.isOpen = !this.isOpen
      if (this.isOpen) {
        this.$nextTick(() => {
          this.scrollToBottom()
          const input = this.$refs.inputRef
          if (input) input.focus()
        })
      }
    },
    handleKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendMessage()
      }
    },
    useSuggestion(text) {
      this.draft = text
      this.$nextTick(() => {
        const input = this.$refs.inputRef
        if (input) input.focus()
      })
    },
    scrollToBottom() {
      const body = this.$refs.bodyRef
      if (body) {
        body.scrollTop = body.scrollHeight
      }
    },
    async sendMessage() {
      const question = String(this.draft || '').trim()
      if (!question || this.isLoading) return

      const userMsg = { id: `${Date.now()}-u`, role: 'user', text: question }
      this.messages.push(userMsg)
      this.draft = ''
      this.isLoading = true
      this.$nextTick(() => this.scrollToBottom())

      let answer = NO_DATA_RESPONSE
      let places = []
      try {
        const res = await askChatbot(question)
        if (res && typeof res.answer === 'string' && res.answer.trim()) {
          answer = res.answer.trim()
        } else {
          answer = NO_DATA_RESPONSE
        }
        if (res && Array.isArray(res.places)) {
          places = res.places
            .filter(place => place && place.id && place.name && place.path)
            .slice(0, 3)
        }
      } catch (err) {
        answer = NO_DATA_RESPONSE
      }

      this.isLoading = false
      const botMsg = { id: `${Date.now()}-a`, role: 'assistant', text: answer, places }
      this.messages.push(botMsg)
      this.$nextTick(() => this.scrollToBottom())
    }
  }
}
</script>

<style scoped>
.tw-chatbot {
  --chat-bg: #f8fafc;
  --chat-surface: #ffffff;
  --chat-ink: #0f172a;
  --chat-muted: #64748b;
  --chat-accent: var(--tw-primary, #6366f1);
  --chat-accent-strong: var(--tw-primary-600, #4f46e5);
  --chat-accent-2: var(--tw-primary-700, #4338ca);
  --chat-border: rgba(15, 23, 42, 0.12);
  --chat-shadow: 0 24px 60px rgba(17, 24, 39, 0.22);
  --chat-radius: 18px;

  position: fixed;
  right: 24px;
  bottom: calc(24px + var(--chatbot-bottom-offset, 0px));
  z-index: 9990;
  font-family: inherit;
  color: var(--chat-ink);
}

.tw-chatbot__fab {
  position: relative;
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 22px;
  background: linear-gradient(140deg, var(--chat-accent), #c7d2fe);
  color: #ffffff;
  box-shadow: 0 16px 30px rgba(99, 102, 241, 0.35);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tw-chatbot__fab:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 22px 40px rgba(99, 102, 241, 0.4);
}

.tw-chatbot__fab-ring {
  position: absolute;
  width: 90px;
  height: 90px;
  border-radius: 32px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.22), rgba(99, 102, 241, 0));
  z-index: -1;
}

.tw-chatbot__fab-icon {
  width: 28px;
  height: 28px;
}

.tw-chatbot__panel {
  position: absolute;
  right: 0;
  bottom: 84px;
  width: 360px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--chat-bg);
  border-radius: var(--chat-radius);
  box-shadow: var(--chat-shadow);
  border: 1px solid rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.tw-chatbot__header {
  padding: 18px 18px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #c7d2fe, #e0e7ff);
  position: relative;
}

.tw-chatbot__header::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.6), transparent 55%);
  opacity: 0.8;
}

.tw-chatbot__title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 1;
}

.tw-chatbot__title-label {
  font-weight: 700;
  font-size: 1.05rem;
}

.tw-chatbot__subtitle {
  font-size: 0.78rem;
  color: var(--chat-accent-2);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.tw-chatbot__close {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.2);
  background: rgba(255, 255, 255, 0.7);
  font-size: 20px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.tw-chatbot__body {
  padding: 16px;
  overflow-y: auto;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.9));
}

.tw-chatbot__empty {
  padding: 16px;
  background: var(--chat-surface);
  border-radius: 16px;
  border: 1px solid var(--chat-border);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.tw-chatbot__empty h4 {
  margin: 0 0 6px 0;
  font-size: 1rem;
}

.tw-chatbot__empty p {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--chat-muted);
}

.tw-chatbot__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tw-chatbot__chip {
  border: 1px solid rgba(47, 93, 80, 0.2);
  background: rgba(47, 93, 80, 0.08);
  color: var(--chat-accent-2);
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.8rem;
}

.tw-chatbot__messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tw-chatbot__msg {
  display: flex;
  animation: msgUp 0.2s ease;
}

.tw-chatbot__msg--user {
  justify-content: flex-end;
}

.tw-chatbot__msg--bot {
  justify-content: flex-start;
}

.tw-chatbot__bubble {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 0.95rem;
  line-height: 1.55;
  background: var(--chat-surface);
  border: 1px solid var(--chat-border);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  white-space: pre-wrap;
}

.tw-chatbot__msg--user .tw-chatbot__bubble {
  background: linear-gradient(135deg, var(--chat-accent), var(--chat-accent-strong));
  color: #ffffff;
  border-color: transparent;
}

.tw-chatbot__links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.tw-chatbot__place-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 7px 10px;
  border-radius: 10px;
  background: #eef2ff;
  color: var(--chat-accent-2);
  border: 1px solid #c7d2fe;
  font-weight: 700;
  font-size: 0.86rem;
  line-height: 1.25;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.tw-chatbot__place-link:hover {
  background: #e0e7ff;
  border-color: #a5b4fc;
  transform: translateY(-1px);
}

.tw-chatbot__typing {
  display: flex;
  gap: 6px;
  padding: 0 6px;
  align-items: center;
}

.tw-chatbot__typing span {
  width: 6px;
  height: 6px;
  background: var(--chat-accent-2);
  border-radius: 50%;
  animation: blink 0.9s infinite;
}

.tw-chatbot__typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.tw-chatbot__typing span:nth-child(3) {
  animation-delay: 0.4s;
}

.tw-chatbot__composer {
  display: flex;
  gap: 10px;
  padding: 14px 16px 16px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.9);
}

.tw-chatbot__input {
  flex: 1 1 auto;
  border: 1px solid var(--chat-border);
  border-radius: 14px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
  resize: none;
  background: #ffffff;
  color: var(--chat-ink);
}

.tw-chatbot__send {
  border: none;
  border-radius: 14px;
  padding: 0 16px;
  font-weight: 700;
  background: var(--chat-accent-2);
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.tw-chatbot__send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tw-chatbot__send:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #254c41;
}

.tw-chatbot-slide-enter-active,
.tw-chatbot-slide-leave-active {
  transition: all 0.22s ease;
}

.tw-chatbot-slide-enter-from,
.tw-chatbot-slide-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@keyframes msgUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .tw-chatbot {
    right: 16px;
    bottom: calc(16px + var(--chatbot-bottom-offset, 0px));
  }

  .tw-chatbot__panel {
    width: min(92vw, 360px);
    bottom: 80px;
  }

  .tw-chatbot__fab {
    width: 54px;
    height: 54px;
  }
}
</style>
