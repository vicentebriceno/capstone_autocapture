<template>
    <div class="p-6 max-w-4xl mx-auto">
        <h2 class="text-2xl font-semibold mb-4">📷 Subida y Alineación de Imagen (BRISK)</h2>

        <label class="block mb-2 font-medium">¿Qué lado estás subiendo?</label>
        <select v-model="selectedSide" class="mb-4 w-full border rounded p-2">
        <option value="Anverso">Anverso</option>
        <option value="Reverso">Reverso</option>
        </select>

        <label class="block mb-2 font-medium">Ajuste de Iluminación (Escala 0.1 a 3.0)</label>
        <input type="range" v-model.number="brightnessFactor" min="0.1" max="3.0" step="0.05" class="w-full mb-4" />
        <p class="text-sm text-gray-600 mb-4">Factor actual: {{ brightnessFactor.toFixed(2) }}</p>

        <input
        type="file"
        @change="handleImageUpload"
        accept="image/*"
        class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0 file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <div v-if="success" class="text-green-600 mt-4">✅ Imagen alineada exitosamente.</div>
        <div v-if="error" class="text-red-600 mt-4">⚠️ {{ error }}</div>

        <div v-if="illumination && meanVal !== null" class="mt-4">
        💡 Iluminación detectada: <strong>{{ illumination }}</strong>
        <span class="text-sm text-gray-500">(Media: {{ meanVal.toFixed(2) }})</span>
        </div>
        <div v-if="sharpness && lapVar !== null" class="mt-1">
        🔎 Nitidez: <strong>{{ sharpness }}</strong>
        <span class="text-sm text-gray-500">(Varianza Laplaciana: {{ lapVar.toFixed(2) }})</span>
        </div>

        <div v-if="imageUrl && alignedImgUrl" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <h3 class="text-lg font-medium mb-2">🖼️ Imagen Original</h3>
            <img :src="imageUrl" class="border rounded w-full" />
        </div>
        <div>
            <h3 class="text-lg font-medium mb-2">🔁 Imagen Alineada</h3>
            <img :src="alignedImgUrl" class="border rounded w-full" />
        </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { ref, onMounted, watch } from 'vue'
    import { loadOpenCV } from '@/services/opencv_loader'

    let cv: any

    const selectedSide = ref('Anverso')
    const brightnessFactor = ref(1.0)
    const imageUrl = ref<string | null>(null)
    const alignedImgUrl = ref<string | null>(null)
    const success = ref(false)
    const error = ref('')
    const illumination = ref('')
    const sharpness = ref('')
    const meanVal = ref<number | null>(null)
    const lapVar = ref<number | null>(null)

    let lastAlignedMat: any = null

    onMounted(async () => {
    try {
        cv = await loadOpenCV()
        console.log('✅ OpenCV.js cargado')
    } catch (err) {
        error.value = 'Error al cargar OpenCV.js.'
    }
    })

    watch(brightnessFactor, () => {
    if (lastAlignedMat) {
        const adjusted = adjustBrightness(lastAlignedMat, brightnessFactor.value)
        alignedImgUrl.value = matToImageURL(adjusted)
        const [lightStr, mean] = evaluateLightingWithValue(adjusted)
        illumination.value = lightStr
        meanVal.value = mean
        const [sharpStr, lap] = evaluateSharpnessWithValue(adjusted)
        sharpness.value = sharpStr
        lapVar.value = lap
    }
    })

    function getTemplatePath(): string {
    return selectedSide.value === 'Anverso'
        ? '/images/frente/natalia.jpg'
        : '/images/reverso/reference3.jpg'
    }

    async function handleImageUpload(event: Event) {
    error.value = ''
    success.value = false
    illumination.value = ''
    sharpness.value = ''
    alignedImgUrl.value = null
    meanVal.value = null
    lapVar.value = null

    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file || !file.type.startsWith('image/')) {
        error.value = 'Selecciona una imagen válida.'
        return
    }

    imageUrl.value = URL.createObjectURL(file)

    try {
        const [inputMat, templateMat] = await Promise.all([
        loadImageFromURL(imageUrl.value),
        loadImageFromURL(getTemplatePath())
        ])

        lastAlignedMat = alignWithBRISK(templateMat, inputMat)
        const brightAligned = adjustBrightness(lastAlignedMat, brightnessFactor.value)
        alignedImgUrl.value = matToImageURL(brightAligned)

        const [lightStr, mean] = evaluateLightingWithValue(brightAligned)
        illumination.value = lightStr
        meanVal.value = mean

        const [sharpStr, lap] = evaluateSharpnessWithValue(brightAligned)
        sharpness.value = sharpStr
        lapVar.value = lap

        success.value = true
    } catch (err: any) {
        console.error(err)
        error.value = 'Error al procesar la imagen: ' + (err?.message || 'desconocido')
    }
    }

    function loadImageFromURL(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0)
        const mat = cv.imread(canvas)
        resolve(mat)
        }
        img.onerror = reject
        img.src = url
    })
    }

    function alignWithBRISK(template: any, input: any): any {
    const gray1 = new cv.Mat(), gray2 = new cv.Mat()
    cv.cvtColor(template, gray1, cv.COLOR_RGBA2GRAY)
    cv.cvtColor(input, gray2, cv.COLOR_RGBA2GRAY)

    const brisk = new cv.BRISK()
    const kp1 = new cv.KeyPointVector(), des1 = new cv.Mat()
    const kp2 = new cv.KeyPointVector(), des2 = new cv.Mat()

    brisk.detectAndCompute(gray1, new cv.Mat(), kp1, des1)
    brisk.detectAndCompute(gray2, new cv.Mat(), kp2, des2)

    const bf = new cv.BFMatcher(cv.NORM_HAMMING, true)
    const matches = new cv.DMatchVector()
    bf.match(des1, des2, matches)

    if (matches.size() < 4) throw new Error('No se encontraron suficientes matches buenos.')

    const srcPtsArr = [], dstPtsArr = []
    for (let i = 0; i < matches.size(); i++) {
        const m = matches.get(i)
        srcPtsArr.push(kp1.get(m.queryIdx).pt)
        dstPtsArr.push(kp2.get(m.trainIdx).pt)
    }

    const srcPts = pointsToMat(srcPtsArr)
    const dstPts = pointsToMat(dstPtsArr)

    const M = cv.findHomography(dstPts, srcPts, cv.RANSAC)
    if (!M || M.empty()) throw new Error('Falló el cálculo de homografía.')

    const aligned = new cv.Mat()
    cv.warpPerspective(input, aligned, M, new cv.Size(template.cols, template.rows))
    return aligned
    }

    function adjustBrightness(mat: any, factor: number): any {
    const brightMat = new cv.Mat()
    mat.convertTo(brightMat, -1, factor, 0)
    return brightMat
    }

    function pointsToMat(pts: any[]): any {
    const mat = cv.Mat.zeros(pts.length, 1, cv.CV_32FC2)
    for (let i = 0; i < pts.length; i++) {
        mat.data32F[i * 2] = pts[i].x
        mat.data32F[i * 2 + 1] = pts[i].y
    }
    return mat
    }

    function matToImageURL(mat: any): string {
    const canvas = document.createElement('canvas')
    cv.imshow(canvas, mat)
    return canvas.toDataURL()
    }

    function evaluateLightingWithValue(img: any): [string, number] {
    const gray = new cv.Mat()
    cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY)
    const meanScalar = cv.mean(gray)
    const mean = meanScalar[0]
    if (mean < 80) return ['Poca luz', mean]
    else if (mean > 190) return ['Mucha luz', mean]
    else return ['Iluminación correcta', mean]
    }

    function evaluateSharpnessWithValue(img: any, threshold = 60): [string, number] {
    const gray = new cv.Mat()
    cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY)
    const lap = new cv.Mat()
    cv.Laplacian(gray, lap, cv.CV_64F)
    const meanStd = new cv.Mat(), stddev = new cv.Mat()
    cv.meanStdDev(lap, meanStd, stddev)
    const lapVar = stddev.data64F[0] ** 2
    return lapVar < threshold ? ['Borrosa', lapVar] : ['Nítida', lapVar]
    }
</script>  