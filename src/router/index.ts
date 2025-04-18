// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import ORBPage from '../pages/ORBPage.vue'
import SIFTPage from '../pages/SIFTPage.vue'

const routes = [
  { path: '/', name: 'Home', component: HomePage },
  { path: '/orb', name: 'ORB', component: ORBPage },
  { path: '/sift', name: 'SIFT', component: SIFTPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
