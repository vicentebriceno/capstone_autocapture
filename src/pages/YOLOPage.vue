<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CameraVideo from '@/components/Camera.vue'
import DarkOverlay from '@/components/DarkOverlay.vue'

import { loadModel, runInference, drawPrediction, preprocessImage, getBestPrediction, parsePredictions } from '@/services/detection/onnx_model'

const cameraRef = ref<InstanceType<typeof CameraVideo> | null>(null)
const resultContainer = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let session: any
let inputName = ""
let outputName = ""
let interval: number

onMounted(async () => {
  // Cargar modelo ONNX
  const model = await loadModel()
  session = model.session
  inputName = model.inputName
  outputName = model.outputName

  // Crear canvas para dibujar resultados
  if (resultContainer.value) {
    const canvas = document.createElement("canvas")
    canvas.width = 640
    canvas.height = 480
    canvas.className = "absolute top-0 left-0"
    resultContainer.value.appendChild(canvas)
    canvasRef.value = canvas
  }

  // Iniciar detección
  interval = window.setInterval(async () => {
    const video = cameraRef.value?.videoRef
    const canvas = canvasRef.value
    if (!video || !canvas || !session) return

    const bitmap = await createImageBitmap(video)
    const img = new Image()
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = offscreen.getContext("2d")!
    ctx.drawImage(bitmap, 0, 0)
    const blob = await offscreen.convertToBlob()
    img.src = URL.createObjectURL(blob)

    img.onload = async () => {
      const { tensor } = preprocessImage(img)
      const outputMap = await session.run({ [inputName]: tensor })
      const preds = parsePredictions(outputMap[outputName].data)
      const best = getBestPrediction(preds)
      drawPrediction(canvas, best)
    }
  }, 500)
})

onBeforeUnmount(() => {
  clearInterval(interval)
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 p-4">
    <!-- Contenedor de cámara + overlay + canvas de resultados -->
    <div class="relative w-[640px] h-[480px] bg-black rounded-lg overflow-hidden" ref="resultContainer">
      <CameraVideo ref="cameraRef" />
      <DarkOverlay :width="640" :height="480" :opacity="0.8" />
      <!-- El canvas para dibujar las predicciones se insertará dinámicamente en resultContainer -->
    </div>
  </div>
</template>
