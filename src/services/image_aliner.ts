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

//  Redimensionar ambas imágenes a un tamaño estándar
const standardWidth = 1000
const scaleRatioRef = standardWidth / referenceMat.cols
const scaleRatioTest = standardWidth / testMat.cols

cv.resize(referenceMat, referenceMat, new cv.Size(standardWidth, Math.round(referenceMat.rows * scaleRatioRef)))
cv.resize(testMat, testMat, new cv.Size(standardWidth, Math.round(testMat.rows * scaleRatioTest)))

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

  // 🛑 Validación de descriptores vacíos
  if (descRef.empty() || descTest.empty()) {
    console.warn('❌ Descriptores vacíos: no se puede continuar con el matching.')
    return
  }

  const bf = new cv.BFMatcher(cv.NORM_HAMMING, false)
  const matches = new cv.DMatchVectorVector()
  bf.knnMatch(descTest, descRef, matches, 2) // test contra referencia

  const goodMatches = new cv.DMatchVector()
  for (let i = 0; i < matches.size(); i++) {
    const m = matches.get(i).get(0)
    const n = matches.get(i).get(1)
    if (m.distance < 0.85 * n.distance) {
      goodMatches.push_back(m)
    }
  }

  console.log('🔹 Keypoints referencia:', kpRef.size())
  console.log('🔹 Keypoints prueba:', kpTest.size())
  console.log('🔍 Coincidencias totales:', matches.size())
  console.log('✅ Coincidencias buenas encontradas:', goodMatches.size())

  if (goodMatches.size() >= 10) {
    applyHomographyAndDraw(cv, container, referenceMat, testMat, kpRef, kpTest, goodMatches)
  } else {
    console.warn('⚠️ No hay suficientes coincidencias para alinear con ORB.')
  }

  // Limpieza
  kpRef.delete(); kpTest.delete()
  descRef.delete(); descTest.delete()
  matches.delete(); goodMatches.delete()
  bf.delete(); orb.delete(); orbTest.delete()
  referenceMat.delete(); testMat.delete()
}

// === Utilidad común para aplicar homografía y dibujar el resultado ===
function applyHomographyAndDraw(cv: any, container: HTMLDivElement, referenceMat: any, testMat: any, kpRef: any, kpTest: any, goodMatches: any) {
  try {
    const srcPoints: number[] = [] // puntos en testMat
    const dstPoints: number[] = [] // puntos en referenceMat

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

    // ✂️ Aquí recortamos desde la imagen de prueba usando la referencia como guía
    const croppedMat = new cv.Mat()
    const dsize = new cv.Size(referenceMat.cols, referenceMat.rows)

    console.log('📐 Usando warpPerspective para recortar la cédula desde la imagen grande...')
    console.log('📏 Tamaño testMat:', testMat.cols, testMat.rows)
    console.log('📏 Tamaño referenciaMat:', referenceMat.cols, referenceMat.rows)

    // Recortar desde testMat usando la homografía (test → ref)
    cv.warpPerspective(testMat, croppedMat, homography, dsize)

    const canvasResult = document.createElement('canvas')
    cv.imshow(canvasResult, croppedMat)

    container.innerHTML = ''
    container.appendChild(canvasResult)

    console.log('✅ Cédula extraída y mostrada en canvas.')

    // Limpieza
    srcMat.delete()
    dstMat.delete()
    mask.delete()
    homography.delete()
    croppedMat.delete()
  } catch (err) {
    console.error('❌ Error al aplicar homografía:', err)
  }
}
function drawMatches(
  cv: any,
  container: HTMLDivElement,
  img1: any,
  img2: any,
  kp1: any,
  kp2: any,
  goodMatches: any
) {
  const height = Math.max(img1.rows, img2.rows)
  const width = img1.cols + img2.cols

  const result = new cv.Mat()
  result.create(height, width, cv.CV_8UC3)
  img1.copyTo(result.roi(new cv.Rect(0, 0, img1.cols, img1.rows)))
  img2.copyTo(result.roi(new cv.Rect(img1.cols, 0, img2.cols, img2.rows)))

  for (let i = 0; i < goodMatches.size(); i++) {
    const match = goodMatches.get(i)
    const pt1 = kp1.get(match.queryIdx).pt
    const pt2 = kp2.get(match.trainIdx).pt

    const color = new cv.Scalar(
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255,
      255
    )

    cv.line(
      result,
      new cv.Point(pt1.x, pt1.y),
      new cv.Point(pt2.x + img1.cols, pt2.y),
      color,
      1
    )
    cv.circle(result, new cv.Point(pt1.x, pt1.y), 4, color, -1)
    cv.circle(result, new cv.Point(pt2.x + img1.cols, pt2.y), 4, color, -1)
  }

  const canvas = document.createElement('canvas')
  cv.imshow(canvas, result)
  container.innerHTML = ''
  container.appendChild(canvas)
  console.log('🧠 Matches visualizados en canvas')

  result.delete()
}export { drawMatches }
export { loadImageAsMat }

