<script setup lang="ts">
import { onMounted } from 'vue'

// Función para procesar la imagen
async function testOpenCV() {
  const cv = (window as any).cv
  try {
    // ✅ Cargamos la imagen desde /public/images/image2.jpg
    const img = new Image()
    img.src = '/images/image2.jpg'
    await new Promise((resolve) => (img.onload = resolve))

    // ✅ Crear canvas para cargar la imagen
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    // ✅ Leer la imagen con OpenCV
    const src = cv.imread(canvas)
    console.log('✅ Imagen leída con OpenCV:', src)

    // ✅ Convertir a blanco y negro (escala de grises)
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    console.log('✅ Imagen convertida a blanco y negro.')

    // ✅ Calcular luminosidad promedio
    const mean = cv.mean(gray)
    console.log(`💡 Luminosidad promedio: ${mean[0].toFixed(2)}`)

    // ✅ Mostrar imagen procesada (opcional: debug visual)
    cv.imshow(canvas, gray)
    document.body.appendChild(canvas)

    // ✅ Liberar memoria
    src.delete()
    gray.delete()

    console.log('✅ Proceso completado correctamente.')
  } catch (error) {
    console.error('❌ Error usando OpenCV:', error)
  }
}

onMounted(async () => {
  console.log('📂 Verificando archivos disponibles:')
  fetch('/opencv/opencv_js.wasm')
    .then((res) => {
      if (res.ok) {
        console.log('✅ WASM encontrado y accesible.')
      } else {
        console.warn('❌ WASM no encontrado:', res.status)
      }
    })
    .catch((err) => console.error('❌ Error al cargar WASM:', err))

  if (!(window as any).cvScriptLoaded) {
    console.log('⏳ Cargando OpenCV.js...')

    const script = document.createElement('script')
    script.src = '/opencv/opencv_js.js'
    script.async = true
    script.onload = () => {
      console.log('✅ OpenCV.js script cargado.')

      const cvFactory = (globalThis as any).cv
      if (typeof cvFactory === 'function') {
        console.log('🚀 Ejecutando factory de OpenCV.js...')
        cvFactory({
          locateFile(path: string) {
            if (path.endsWith('.wasm')) {
              console.log('🔍 Solicitando WASM:', path)
              return '/opencv/opencv_js.wasm'
            }
            console.log('🔍 Solicitando archivo:', path)
            return '/opencv/' + path
          }
        }).then((cv: any) => {
          console.log('✅ OpenCV.js inicializado desde factory.')
          ;(globalThis as any).cv = cv
          testOpenCV()
        }).catch((err: any) => {
          console.error('❌ Error inicializando OpenCV.js:', err)
        })
      } else {
        console.warn('⚠️ Factory de OpenCV.js no encontrado.')
      }
    }
    script.onerror = (e) => {
      console.error('❌ Error cargando OpenCV.js:', e)
    }
    document.body.appendChild(script)

    ;(window as any).cvScriptLoaded = true
  } else {
    console.log('⚠️ OpenCV.js ya estaba cargado.')
    testOpenCV()
  }
})
</script>

<template>
  <div>
    <h1>ORB Page</h1>
    <router-link to="/">Volver al Home</router-link>
  </div>
</template>
