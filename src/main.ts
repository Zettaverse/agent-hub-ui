import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import './assets/main.css'

const app = createApp(App)

const theme = localStorage.getItem('zettaverse_theme')
document.documentElement.classList.toggle('dark', theme !== 'light')

app.use(createPinia())
app.use(router)

app.mount('#app')
