import { detectKeypointsAndDescriptors as detectSIFT } from './sift_processor'
import { detectKeypointsAndDescriptors as detectORB } from './orb_processor'

// Utilidad común para cargar imagen y convertir a Mat
async function loadImageAsMat(cv: any, src: string): Promise<any> {
  const image = new Image()
  image.src = src

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)

  return cv.imread(canvas)
}

// === Función para alinear con SIFT ===
export async function alignImagesWithSIFT(
  cv: any,
  referenceImageSrc: string,
  testImageSrc: string,
  container: HTMLDivElement
) {
  const referenceMat = await loadImageAsMat(cv, referenceImageSrc)
  const testMat = await loadImageAsMat(cv, testImageSrc)

  const { keypoints: kpRef, descriptors: descRef, sift } = detectSIFT(cv, referenceMat)
  const { keypoints: kpTest, descriptors: descTest, sift: siftTest } = detectSIFT(cv, testMat)

  // FLANN params
  const indexParams = new cv.FlannBasedMatcher_IndexParams()
  indexParams.setInt('algorithm', 1) // FLANN_INDEX_KDTREE
  indexParams.setInt('trees', 5)

  const searchParams = new cv.FlannBasedMatcher_SearchParams()
  searchParams.setInt('checks', 50)

  const flann = new cv.FlannBasedMatcher(indexParams, searchParams)
  const matches = new cv.DMatchVectorVector()
  flann.knnMatch(descTest, descRef, matches, 2)

  const goodMatches = new cv.DMatchVector()
  for (let i = 0; i < matches.size(); i++) {
    const m = matches.get(i).get(0)
    const n = matches.get(i).get(1)
    if (m.distance < 0.7 * n.distance) {
      goodMatches.push_back(m)
    }
  }

  if (goodMatches.size() > 10) {
    applyHomographyAndDraw(cv, container, referenceMat, testMat, kpRef, kpTest, goodMatches)
  } else {
    console.warn('⚠️ No se encontraron suficientes coincidencias con SIFT.')
  }

  // Liberar memoria
  kpRef.delete(); kpTest.delete()
  descRef.delete(); descTest.delete()
  matches.delete(); goodMatches.delete()
  flann.delete(); sift.delete(); siftTest.delete()
  referenceMat.delete(); testMat.delete()
}

// === Función para alinear con ORB ===
export async function alignImagesWithORB(
  cv: any,
  referenceImageSrc: string,
  testImageSrc: string,
  container: HTMLDivElement
) {
  const referenceMat = await loadImageAsMat(cv, referenceImageSrc)
  const testMat = await loadImageAsMat(cv, testImageSrc)

  const { keypoints: kpRef, descriptors: descRef, orb } = await detectORB(cv, referenceMat)
  const { keypoints: kpTest, descriptors: descTest, orb: orbTest } = await detectORB(cv, testMat)

  const bf = new cv.BFMatcher(cv.NORM_HAMMING, false)
  const matches = new cv.DMatchVectorVector()
  bf.knnMatch(descTest, descRef, matches, 2)

  // 🔍 Información útil para debug
  console.log('🔹 Keypoints referencia:', kpRef.size())
  console.log('🔹 Keypoints prueba:', kpTest.size())
  console.log('🔍 Coincidencias totales:', matches.size())

  const goodMatches = new cv.DMatchVector()
  for (let i = 0; i < matches.size(); i++) {
    const m = matches.get(i).get(0)
    const n = matches.get(i).get(1)
    if (m.distance < 0.85 * n.distance) {
      goodMatches.push_back(m)
    }
  }

  console.log('✅ Coincidencias buenas encontradas:', goodMatches.size())

  if (goodMatches.size() > 10) {
    applyHomographyAndDraw(cv, container, referenceMat, testMat, kpRef, kpTest, goodMatches)
  } else {
    console.warn('⚠️ ORB no encontró suficientes coincidencias. Probando con SIFT...')
    try {
      await alignImagesWithSIFT(cv, referenceImageSrc, testImageSrc, container)
    } catch (err) {
      console.error('❌ Error al hacer fallback con SIFT:', err)
    }
    
  }

  // Liberar memoria
  kpRef.delete(); kpTest.delete()
  descRef.delete(); descTest.delete()
  matches.delete(); goodMatches.delete()
  bf.delete(); orb.delete(); orbTest.delete()
  referenceMat.delete(); testMat.delete()
}

// === Utilidad común para aplicar homografía y dibujar el resultado ===
function applyHomographyAndDraw(cv: any, container: HTMLDivElement, referenceMat: any, testMat: any, kpRef: any, kpTest: any, goodMatches: any) {
  try {
    const srcPoints: number[] = []
    const dstPoints: number[] = []

    for (let i = 0; i < goodMatches.size(); i++) {
      const match = goodMatches.get(i)
      const testPoint = kpTest.get(match.queryIdx).pt
      const refPoint = kpRef.get(match.trainIdx).pt
      srcPoints.push(testPoint.x, testPoint.y)
      dstPoints.push(refPoint.x, refPoint.y)
    }

    console.log('🟢 Puntos origen:', srcPoints)
    console.log('🔵 Puntos destino:', dstPoints)

    const srcMat = cv.matFromArray(srcPoints.length / 2, 1, cv.CV_32FC2, srcPoints)
    const dstMat = cv.matFromArray(dstPoints.length / 2, 1, cv.CV_32FC2, dstPoints)

    const mask = new cv.Mat()

    const homography = cv.findHomography(srcMat, dstMat, cv.RANSAC, 5, mask)

    if (!homography || homography.empty()) {
      console.warn('❌ Homografía no válida, no se puede aplicar.')
      return
    }


    const alignedMat = new cv.Mat()
    const dsize = new cv.Size(referenceMat.cols, referenceMat.rows)
    cv.warpPerspective(testMat, alignedMat, homography, dsize)

    const canvasResult = document.createElement('canvas')
    cv.imshow(canvasResult, alignedMat)

    container.innerHTML = ''
    container.appendChild(canvasResult)

    console.log('✅ Imagen alineada mostrada en canvas.')

    // Limpieza
    srcMat.delete()
    dstMat.delete()
    mask.delete()
    homography.delete()
    alignedMat.delete()
  } catch (err) {
    console.error('❌ Error al aplicar homografía:', err)
  }
}
