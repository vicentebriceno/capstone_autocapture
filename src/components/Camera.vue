<template>
  <video
    ref="videoRef"
    autoplay
    playsinline
    class="w-full h-full object-cover"
  ></video>
</template>

<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount } from 'vue'

const videoRef = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null

onMounted(async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (videoRef.value) videoRef.value.srcObject = stream
  } catch (err) {
    console.error('❌ Error al acceder a la cámara:', err)
  }
})

onBeforeUnmount(() => {
  if (stream) stream.getTracks().forEach((track) => track.stop())
})
</script>
