<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { loadOpenCV } from '../services/opencv_loader'
import { alignImagesWithORB } from '../services/image_aliner'

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

function readImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = src
    img.onload = () => resolve(img)
    img.onerror = reject
  })
}

function handleProcessImages() {
  if (cvInstance.value && referenceImage.value && testImage.value && resultContainer.value) {
    alignImagesWithORB(cvInstance.value, referenceImage.value, testImage.value, resultContainer.value)
  } else {
    console.warn('⚠️ Falta algún parámetro para procesar las imágenes.')
  }
}

async function processImages() {
  const cv = cvInstance.value

  const referenceImg = await readImageFromSrc(referenceImage.value!)
  const testImg = await readImageFromSrc(testImage.value!)

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

  if (resultContainer.value) {
    resultContainer.value.innerHTML = ''
    alignImagesWithORB(cv, referenceMat, testMat, resultContainer.value)
  }

  referenceMat.delete()
  testMat.delete()
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
      @click="handleProcessImages"
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
