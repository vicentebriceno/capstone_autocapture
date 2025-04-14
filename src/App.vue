<template>
  <div>
    <Navbar />
    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import Navbar from './components/Navbar.vue'
</script>

<style scoped>
.content {
  margin-top: 70px; /* Ajusta según la altura de tu navbar */
  padding: 1rem;
}
</style>
