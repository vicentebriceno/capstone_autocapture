<template>
  <div class="flex flex-col items-center gap-4 p-4">
    <div class="relative w-[640px] h-[480px] bg-black rounded-lg overflow-hidden">
      <CameraVideo ref="cameraRef" />
      <DarkOverlay :width="640" :height="480" :opacity="0.8" />
    </div>

    <div ref="resultContainer" class="mt-4"></div>
  </div>
</template>


<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { loadOpenCV } from '@/services/opencv_loader'
import { useFrameCapture } from '../utils/useFrameCapture'
import { detectObjectBoundingBox } from '../services/detection/detectObjectBoundingBox'
import CameraVideo from '@/components/Camera.vue'
import DarkOverlay from '@/components/DarkOverlay.vue'

// Refs y tipos
const cameraRef = ref<InstanceType<typeof CameraVideo> | null>(null)
const resultContainer = ref<HTMLDivElement | null>(null)
const capturedFrame = ref<string | null>(null)
const cvInstance = ref<any>(null)
let interval: number

onMounted(async () => {
  // Cargar OpenCV
  cvInstance.value = await loadOpenCV()

  // Comenzar captura cada 1 segundo
  interval = window.setInterval(async () => {
    if (
      cameraRef.value?.videoRef &&
      resultContainer.value
    ) {
      const { capturedFrame: frame, captureRegion } = useFrameCapture(cameraRef.value.videoRef)
      captureRegion()

      if (frame.value) {
        capturedFrame.value = frame.value
        await detectObjectBoundingBox(cvInstance.value, frame.value, resultContainer.value!, "orb")
      }
    }
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(interval)
})
</script>