// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import ORBPage from '../pages/ORBPage.vue'
import BriskPage from '../pages/BriskPage.vue'
import AkazePage from '../pages/AkazePage.vue'
import CameraPage from '../pages/CameraPage.vue'
import YOLOPage from '../pages/YOLOPage.vue'
import QualityPage from '../pages/QualityPage.vue'

const routes = [
  { path: '/', name: 'Home', component: HomePage },
  { path: '/orb', name: 'ORB', component: ORBPage },
  { path: '/brisk', name: 'BRISK', component: BriskPage },  
  { path: '/akaze', name: 'AKAZE', component: AkazePage },  
  { path: '/camera', name: 'Camera', component: CameraPage },
  { path: '/yolo', name: 'YOLO', component: YOLOPage },
  { path: '/quality_check', name: 'Quality Check', component: QualityPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
