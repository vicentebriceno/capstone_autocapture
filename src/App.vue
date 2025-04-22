<template>
  <div>
    <Navbar />
    <div class="mt-[70px] p-4">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import Navbar from './components/Navbar.vue'
</script>