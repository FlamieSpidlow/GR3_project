import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { notify, requestConfirmation, requestPrompt } from './utils/notifications'

import './styles/theme.css'


const app = createApp(App)

app.config.globalProperties.$notify = notify
app.config.globalProperties.$confirm = requestConfirmation
app.config.globalProperties.$prompt = requestPrompt

app.use(router).mount('#app')
