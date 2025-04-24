<template>
  <video
    ref="videoRef"
    autoplay
    playsinline
    class="w-full h-full object-cover"
  ></video>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
const videoRef = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null

onMounted(async () => {
  stream = await navigator.mediaDevices.getUserMedia({ video: true })
  if (videoRef.value) videoRef.value.srcObject = stream
})

onBeforeUnmount(() => {
  stream?.getTracks().forEach(track => track.stop())
})

defineExpose({ videoRef })
</script>
