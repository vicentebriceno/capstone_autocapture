<template>
  <nav class="navbar">
    <ul class="nav-list">
      <li v-for="route in routes" :key="route.path">
        <router-link :to="route.path">{{ route.name }}</router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const routes = router.options.routes
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: #333;
  padding: 1rem;
  z-index: 1000;

  display: flex;
  justify-content: center; /* Centra horizontalmente los elementos */
}

.nav-list {
  list-style: none;
  display: flex;
  gap: 1rem;
  margin: 0;
  padding: 0;
}

.nav-list li a {
  color: white;
  text-decoration: none;
}

.nav-list li a.router-link-active {
  font-weight: bold;
  text-decoration: underline;
}
</style>
