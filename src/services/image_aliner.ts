import { detectKeypointsAndDescriptors as detectSIFT } from './sift_processor'
import { detectKeypointsAndDescriptors as detectORB } from './orb_processor'

// === Utilidad común para aplicar homografía y dibujar el resultado ===
function applyHomographyAndDraw(cv: any, container: HTMLDivElement, referenceMat: any, testMat: any, kpRef: any, kpTest: any, goodMatches: any) {
  const srcPoints: number[] = []
  const dstPoints: number[] = []

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
  const inliers = cv.countNonZero(mask)

  if (!homography.empty() && inliers > 20) {
    const alignedMat = new cv.Mat()
    const dsize = new cv.Size(referenceMat.cols, referenceMat.rows)
    cv.warpPerspective(testMat, alignedMat, homography, dsize)

    const canvasResult = document.createElement('canvas')
    cv.imshow(canvasResult, alignedMat)

    container.innerHTML = ''
    container.appendChild(canvasResult)

    console.log(`✅ Imagen alineada con ${inliers} inliers.`)

    alignedMat.delete()
  } else {
    console.warn(`⚠️ Homografía inválida o pocos inliers (${inliers})`)
  }

  srcMat.delete()
  dstMat.delete()
  mask.delete()
  homography.delete()
}

// === Utilidad común para cargar imagen y convertir a Mat ===
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

// === Función para alinear con ORB y múltiples referencias ===
export async function alignWithMultipleReferences(
  cv: any,
  testImageSrc: string,
  referencePaths: string[],
  container: HTMLDivElement,
  nfeatures = 2000,
  minMatches = 80,
  ransacThreshold = 5.0,
  loweRatio = 0.75
) {
  const testMat = await loadImageAsMat(cv, testImageSrc)
  const grayTest = new cv.Mat()
  cv.cvtColor(testMat, grayTest, cv.COLOR_RGBA2GRAY)

  const orb = new cv.ORB(nfeatures)
  const kpTest = new cv.KeyPointVector()
  const descTest = new cv.Mat()
  orb.detectAndCompute(grayTest, new cv.Mat(), kpTest, descTest)

  if (descTest.empty()) {
    console.warn('⚠️ No se detectaron descriptores en la imagen de prueba.')
    return
  }

  let bestAligned: any = null
  let maxInliers = 0

  for (const refPath of referencePaths) {
    const refMat = await loadImageAsMat(cv, refPath)
    const grayRef = new cv.Mat()
    cv.cvtColor(refMat, grayRef, cv.COLOR_RGBA2GRAY)

    const kpRef = new cv.KeyPointVector()
    const descRef = new cv.Mat()
    orb.detectAndCompute(grayRef, new cv.Mat(), kpRef, descRef)

    if (descRef.empty()) {
      console.warn(`⚠️ No se detectaron descriptores en ${refPath}.`)
      continue
    }

    const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false)
    const matches = new cv.DMatchVectorVector()
    matcher.knnMatch(descTest, descRef, matches, 2)

    const goodMatches = new cv.DMatchVector()
    for (let i = 0; i < matches.size(); i++) {
      const m = matches.get(i).get(0)
      const n = matches.get(i).get(1)
      if (m.distance < loweRatio * n.distance) {
        goodMatches.push_back(m)
      }
    }

    if (goodMatches.size() >= minMatches) {
      const srcPoints: number[] = []
      const dstPoints: number[] = []

      for (let i = 0; i < goodMatches.size(); i++) {
        const match = goodMatches.get(i)
        const testPt = kpTest.get(match.queryIdx).pt
        const refPt = kpRef.get(match.trainIdx).pt
        srcPoints.push(testPt.x, testPt.y)
        dstPoints.push(refPt.x, refPt.y)
      }

      const srcMat = cv.matFromArray(goodMatches.size(), 1, cv.CV_32FC2, srcPoints)
      const dstMat = cv.matFromArray(goodMatches.size(), 1, cv.CV_32FC2, dstPoints)
      const mask = new cv.Mat()
      const homography = cv.findHomography(srcMat, dstMat, cv.RANSAC, ransacThreshold, mask)

      const inliers = Array.from(new Uint8Array(mask.data)).reduce((a, b) => a + b, 0)
      console.log(`📌 ${refPath} → ${inliers} inliers, ${goodMatches.size()} buenas coincidencias.`)

      if (!homography.empty() && inliers > maxInliers) {
        maxInliers = inliers
        const aligned = new cv.Mat()
        cv.warpPerspective(testMat, aligned, homography, new cv.Size(refMat.cols, refMat.rows))

        if (bestAligned) bestAligned.delete()
        bestAligned = aligned
      }

      srcMat.delete()
      dstMat.delete()
      mask.delete()
      homography.delete()
    }

    kpRef.delete()
    descRef.delete()
    grayRef.delete()
    refMat.delete()
    matches.delete()
    goodMatches.delete()
    matcher.delete()
  }

  if (bestAligned) {
    const canvas = document.createElement('canvas')
    cv.imshow(canvas, bestAligned)
    container.innerHTML = ''
    container.appendChild(canvas)
    console.log(`✅ Imagen alineada mostrada con ${maxInliers} inliers.`)
    bestAligned.delete()
  } else {
    console.warn('⚠️ No se logró alinear con ninguna referencia.')
  }

  testMat.delete()
  grayTest.delete()
  kpTest.delete()
  descTest.delete()
  orb.delete()
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

