<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { loadOpenCV } from '../utils/opencv_loader'

// Referencias para las imágenes seleccionadas
const referenceImage = ref<string | null>(null)
const testImage = ref<string | null>(null)
const cvInstance = ref<any>(null)
const resultContainer = ref<HTMLDivElement | null>(null)

function handleReferenceImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    referenceImage.value = URL.createObjectURL(file)
  }
}

function handleTestImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    testImage.value = URL.createObjectURL(file)
  }
}

// Cargar imagen desde src como HTMLImageElement
function readImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = src
    img.onload = () => resolve(img)
    img.onerror = reject
  })
}

// Función principal de alineación
async function alignImages(referenceSrc: string, testSrc: string) {
  const cv = cvInstance.value

  // 🔄 Limpiar el contenedor de resultados si ya había un canvas previo
  if (resultContainer.value) {
    resultContainer.value.innerHTML = ''
  }

  const referenceImg = await readImageFromSrc(referenceSrc)
  const testImg = await readImageFromSrc(testSrc)

  const refCanvas = document.createElement('canvas')
  refCanvas.width = referenceImg.width
  refCanvas.height = referenceImg.height
  refCanvas.getContext('2d')!.drawImage(referenceImg, 0, 0)

  const testCanvas = document.createElement('canvas')
  testCanvas.width = testImg.width
  testCanvas.height = testImg.height
  testCanvas.getContext('2d')!.drawImage(testImg, 0, 0)

  const referenceMat = cv.imread(refCanvas)
  const testMat = cv.imread(testCanvas)

  const grayRef = new cv.Mat()
  const grayTest = new cv.Mat()
  cv.cvtColor(referenceMat, grayRef, cv.COLOR_RGBA2GRAY)
  cv.cvtColor(testMat, grayTest, cv.COLOR_RGBA2GRAY)

  const orb = new cv.ORB()

  const kpRef = new cv.KeyPointVector()
  const descRef = new cv.Mat()
  orb.detectAndCompute(grayRef, new cv.Mat(), kpRef, descRef)

  const kpTest = new cv.KeyPointVector()
  const descTest = new cv.Mat()
  orb.detectAndCompute(grayTest, new cv.Mat(), kpTest, descTest)

  const bf = new cv.BFMatcher(cv.NORM_HAMMING, false)
  const matches = new cv.DMatchVectorVector()
  bf.knnMatch(descTest, descRef, matches, 2)

  const goodMatches = new cv.DMatchVector()
  for (let i = 0; i < matches.size(); i++) {
    const m = matches.get(i).get(0)
    const n = matches.get(i).get(1)
    if (m.distance < 0.75 * n.distance) {
      goodMatches.push_back(m)
    }
  }

  if (goodMatches.size() >= 10) {
    const srcPoints = []
    const dstPoints = []

    for (let i = 0; i < goodMatches.size(); i++) {
      const match = goodMatches.get(i)
      const testPoint = kpTest.get(match.queryIdx).pt
      const refPoint = kpRef.get(match.trainIdx).pt
      srcPoints.push(testPoint.x, testPoint.y)
      dstPoints.push(refPoint.x, refPoint.y)
    }

    const srcMat = cv.matFromArray(srcPoints.length / 2, 1, cv.CV_32FC2, srcPoints)
    const dstMat = cv.matFromArray(dstPoints.length / 2, 1, cv.CV_32FC2, dstPoints)

    const mask = new cv.Mat()
    const homography = cv.findHomography(srcMat, dstMat, cv.RANSAC, 5, mask)

    const alignedMat = new cv.Mat()
    const dsize = new cv.Size(referenceMat.cols, referenceMat.rows)
    cv.warpPerspective(testMat, alignedMat, homography, dsize)

    const canvasResult = document.createElement('canvas')
    cv.imshow(canvasResult, alignedMat)

    // ✅ Insertamos el canvas en el contenedor correspondiente
    if (resultContainer.value) {
      resultContainer.value.appendChild(canvasResult)
    }

    console.log('✅ Imagen alineada mostrada en canvas.')

    // Limpiar memoria
    srcMat.delete()
    dstMat.delete()
    mask.delete()
    homography.delete()
    alignedMat.delete()
  } else {
    console.warn('⚠️ No se encontraron suficientes coincidencias.')
  }

  // Liberar memoria
  grayRef.delete()
  grayTest.delete()
  referenceMat.delete()
  testMat.delete()
  kpRef.delete()
  kpTest.delete()
  descRef.delete()
  descTest.delete()
  matches.delete()
  goodMatches.delete()
  bf.delete()
  orb.delete()
}

onMounted(async () => {
  try {
    const cv = await loadOpenCV()
    cvInstance.value = cv
    console.log('🧩 OpenCV.js está listo')
  } catch (error) {
    console.error('❌ Error cargando OpenCV:', error)
  }
})
</script>

<template>
  <div class="container">
    <h1>Demostración: Funcionamiento de ORB con 2 imágenes</h1>

    <div class="input-group">
      <label for="referenceImage">Selecciona la imagen de referencia:</label>
      <input id="referenceImage" type="file" accept="image/*" @change="handleReferenceImage" />
    </div>

    <div v-if="referenceImage" class="image-preview">
      <h3>Imagen de referencia:</h3>
      <img :src="referenceImage" alt="Imagen de referencia" />
    </div>

    <div class="input-group">
      <label for="testImage">Selecciona la imagen de prueba:</label>
      <input id="testImage" type="file" accept="image/*" @change="handleTestImage" />
    </div>

    <div v-if="testImage" class="image-preview">
      <h3>Imagen de prueba:</h3>
      <img :src="testImage" alt="Imagen de prueba" />
    </div>

    <button
      v-if="referenceImage && testImage"
      @click="alignImages(referenceImage!, testImage!)"
    >
      Procesar imágenes
    </button>

    <!-- ✅ Aquí se muestra el resultado debajo -->
    <div ref="resultContainer" class="result-container"></div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
}

.input-group {
  margin: 1rem 0;
  text-align: center;

  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-preview {
  margin: 1rem 0;
  text-align: center;
}

.image-preview img {
  max-width: 400px;
  max-height: 400px;
  border: 1px solid #ccc;
  margin-top: 0.5rem;
}

button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}

.result-container {
  margin-top: 2rem;
  text-align: center;
}
</style>
