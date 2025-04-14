import { detectKeypointsAndDescriptors } from './orb_processor'

// Utilidad para cargar una imagen desde su src
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

export async function alignImages(cv: any, referenceImageSrc: string, testImageSrc: string, container: HTMLDivElement) {
  // ✅ Cargamos las imágenes como Mat
  const referenceMat = await loadImageAsMat(cv, referenceImageSrc)
  const testMat = await loadImageAsMat(cv, testImageSrc)

  // Detectar keypoints y descriptores
  const { keypoints: kpRef, descriptors: descRef, orb: orbRef } = await detectKeypointsAndDescriptors(cv, referenceMat)
  const { keypoints: kpTest, descriptors: descTest, orb: orbTest } = await detectKeypointsAndDescriptors(cv, testMat)

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

    const alignedMat = new cv.Mat()
    const dsize = new cv.Size(referenceMat.cols, referenceMat.rows)
    cv.warpPerspective(testMat, alignedMat, homography, dsize)

    const canvasResult = document.createElement('canvas')
    cv.imshow(canvasResult, alignedMat)

    // Limpiar canvas anterior
    container.innerHTML = ''
    container.appendChild(canvasResult)

    console.log('✅ Imagen alineada mostrada en canvas.')

    // Limpiar memoria intermedia
    srcMat.delete()
    dstMat.delete()
    mask.delete()
    homography.delete()
    alignedMat.delete()
  } else {
    console.warn('⚠️ No se encontraron suficientes coincidencias.')
  }

  // Liberar memoria
  kpRef.delete()
  kpTest.delete()
  descRef.delete()
  descTest.delete()
  matches.delete()
  goodMatches.delete()
  bf.delete()
  orbRef.delete()
  orbTest.delete()
  referenceMat.delete()
  testMat.delete()
}
