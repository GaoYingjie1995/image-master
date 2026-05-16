<script setup lang="ts">
import TitleBar from './components/layout/TitleBar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import StatusBar from './components/layout/StatusBar.vue'
</script>

<template>
  <div class="flex flex-col h-screen bg-bg-deep">
    <TitleBar />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar />
      <main class="flex-1 overflow-hidden">
        <router-view />
      </main>
    </div>
    <StatusBar />
  </div>
</template>
