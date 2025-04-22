<template>
  <div class="relative w-[640px] h-[480px] bg-black rounded-lg overflow-hidden">
    <CameraVideo />
    <DarkOverlay :width="640" :height="480" :opacity="0.8" />
    <DetectionOverlay />
  </div>
</template>

<script setup lang="ts">
import CameraVideo from '@/components/Camera.vue'
import DarkOverlay from '@/components/DarkOverlay.vue'
import DetectionOverlay from '@/components/DetectionOverlay.vue'
</script>
