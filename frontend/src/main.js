import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import './styles/theme.css'


const app = createApp(App)

// Simple notification plugin
app.config.globalProperties.$notify = function(options) {
  const notification = document.createElement('div')
  notification.className = `notification notification-${options.type || 'info'}`
  notification.textContent = options.message
  
  const style = document.createElement('style')
  if (!document.getElementById('notification-styles')) {
    style.id = 'notification-styles'
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
      }
      .notification-success {
        background-color: #d1fae5;
        color: #065f46;
        border-left: 4px solid #10b981;
      }
      .notification-error {
        background-color: #fee2e2;
        color: #991b1b;
        border-left: 4px solid #dc2626;
      }
      .notification-info {
        background-color: #dbeafe;
        color: #0c2d6b;
        border-left: 4px solid #3b82f6;
      }
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(style)
  }
  
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease'
    setTimeout(() => notification.remove(), 300)
  }, options.duration || 3000)
}

app.use(router).mount('#app')