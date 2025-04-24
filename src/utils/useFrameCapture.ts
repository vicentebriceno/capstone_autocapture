import { ref } from 'vue'

export function useFrameCapture(videoElement: HTMLVideoElement | null, width = 640, height = 480) {
  const capturedFrame = ref<string | null>(null)

  function captureRegion() {
    if (!videoElement) return

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const ctx = tempCanvas.getContext('2d')!
    ctx.drawImage(videoElement, 0, 0, width, height)

    const rectWidth = width * 0.8
    const rectHeight = rectWidth * 10 / 16
    const rectX = (width - rectWidth) / 2
    const rectY = (height - rectHeight) / 2

    const croppedCanvas = document.createElement('canvas')
    croppedCanvas.width = rectWidth
    croppedCanvas.height = rectHeight
    const croppedCtx = croppedCanvas.getContext('2d')!

    croppedCtx.drawImage(
      tempCanvas,
      rectX, rectY, rectWidth, rectHeight,
      0, 0, rectWidth, rectHeight
    )

    capturedFrame.value = croppedCanvas.toDataURL('image/jpeg')
  }

  return { capturedFrame, captureRegion }
}