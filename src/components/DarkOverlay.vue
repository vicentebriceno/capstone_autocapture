<template>
  <canvas
    ref="maskCanvas"
    class="absolute inset-0 pointer-events-none z-10"
    :width="width"
    :height="height"
    :opacity="opacity"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'

const props = defineProps<{
  width: number
  height: number
  opacity: number
}>()

const maskCanvas = ref<HTMLCanvasElement | null>(null)

function drawMask() {
  const canvas = maskCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')!
  const { width, height } = props

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = `rgba(0, 0, 0, ${props.opacity})`

  ctx.fillRect(0, 0, width, height)

  const rectWidth = width * 0.8
  const rectHeight = rectWidth * 10 / 16
  const rectX = (width - rectWidth) / 2
  const rectY = (height - rectHeight) / 2
  const radius = 16

  // Recorte
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(rectX + radius, rectY)
  ctx.lineTo(rectX + rectWidth - radius, rectY)
  ctx.arcTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius, radius)
  ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius)
  ctx.arcTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight, radius)
  ctx.lineTo(rectX + radius, rectY + rectHeight)
  ctx.arcTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius, radius)
  ctx.lineTo(rectX, rectY + radius)
  ctx.arcTo(rectX, rectY, rectX + radius, rectY, radius)
  ctx.closePath()
  ctx.fill()

  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()
}

onMounted(() => {
  nextTick(drawMask)
})

watch(() => props, drawMask, { deep: true })
</script>