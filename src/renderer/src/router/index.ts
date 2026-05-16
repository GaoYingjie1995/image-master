import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'all', component: () => import('../views/AllPhotos.vue') },
  { path: '/today', name: 'today', component: () => import('../views/AllPhotos.vue') },
  { path: '/rated', name: 'rated', component: () => import('../views/AllPhotos.vue') },
  { path: '/rejected', name: 'rejected', component: () => import('../views/AllPhotos.vue') },
  { path: '/album/:id', name: 'album', component: () => import('../views/AllPhotos.vue') },
  { path: '/duplicates', name: 'duplicates', component: () => import('../views/DuplicateView.vue') },
  { path: '/cleanup', name: 'cleanup', component: () => import('../views/CleanupView.vue') },
  { path: '/batch-rename', name: 'batch-rename', component: () => import('../views/BatchRenameView.vue') },
  { path: '/batch-export', name: 'batch-export', component: () => import('../views/BatchExportView.vue') },
  { path: '/map', name: 'map', component: () => import('../views/MapView.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
