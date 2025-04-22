<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { loadOpenCV } from '../services/opencv_loader'
import { alignWithMultipleReferences } from '../services/image_aliner'

const testImage = ref<string | null>(null)
const cvInstance = ref<any>(null)
const resultContainer = ref<HTMLDivElement | null>(null)

function handleTestImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    testImage.value = URL.createObjectURL(file)
  }
}

function handleProcessImages() {
  if (cvInstance.value && testImage.value && resultContainer.value) {
    const references = [
      '/images/reference1.png',
      '/images/reference2.jpg',
      '/images/reference3.jpg',
      '/images/reference4.jpg',
    ]
    alignWithMultipleReferences(cvInstance.value, testImage.value, references, resultContainer.value)
  } else {
    console.warn('⚠️ Faltan parámetros para procesar la imagen.')
  }
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
    <h1>Demostración: Alineación con múltiples referencias</h1>

    <div class="input-group">
      <label for="testImage">Selecciona la imagen de prueba:</label>
      <input id="testImage" type="file" accept="image/*" @change="handleTestImage" />
    </div>

    <div v-if="testImage" class="image-preview">
      <h3>Imagen de prueba:</h3>
      <img :src="testImage" alt="Imagen de prueba" />
    </div>

    <button v-if="testImage" @click="handleProcessImages">
      Procesar imagen con referencias
    </button>

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