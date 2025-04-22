// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import ORBPage from '../pages/ORBPage.vue'
import ORBReferencesPage from '../pages/ORBReferencesPage.vue'
import SIFTPage from '../pages/SIFTPage.vue'
import CameraPage from '../pages/CameraPage.vue'

const routes = [
  { path: '/', name: 'Home', component: HomePage },
  { path: '/orb', name: 'ORB', component: ORBPage },
  { path: '/orb_multiple_references', name: 'ORB Multiple References', component: ORBReferencesPage },
  { path: '/sift', name: 'SIFT', component: SIFTPage },
  { path: '/camera', name: 'Camera', component: CameraPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
