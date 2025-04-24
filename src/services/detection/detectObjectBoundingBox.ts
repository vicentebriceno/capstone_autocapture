import { getBase64Mat, loadReferenceMat, polygonArea } from '../../utils/image_utils'
import { drawBoundingBox } from '../shared/draw'
import { getGoodMatches } from '../shared/matching'
import { computeTransformedCorners } from '../shared/homography'
import { detectKeypointsAndDescriptors } from './detectKeypointsAndDescriptors'

// --- Función principal con selector de algoritmo ---
export async function detectObjectBoundingBox(
  cv: any,
  frameBase64: string,
  resultContainer: HTMLDivElement,
  algorithm: 'orb' | 'brisk' | 'akaze'
) {
  let frameMat, referenceMat
  let kp1, kp2, desc1, desc2
  let transformedCorners

  try {
    frameMat = await getBase64Mat(cv, frameBase64)
    referenceMat = await loadReferenceMat(cv)

    const result1 = await detectKeypointsAndDescriptors(cv, frameMat, algorithm)
    const result2 = await detectKeypointsAndDescriptors(cv, referenceMat, algorithm)

    kp1 = result1.keypoints
    desc1 = result1.descriptors
    kp2 = result2.keypoints
    desc2 = result2.descriptors

    const goodMatches = getGoodMatches(cv, desc1, desc2)
    if (goodMatches.length < 10) {
      console.warn(`[${algorithm.toUpperCase()}] ❌ Muy pocas coincidencias.`)
      return
    }

    transformedCorners = computeTransformedCorners(cv, goodMatches, kp1, kp2, {
      width: referenceMat.cols,
      height: referenceMat.rows
    })

    const area = polygonArea(transformedCorners.data32F)
    console.log(`[${algorithm.toUpperCase()}] Área de la bounding box:`, area)
    if (area < 80000) {
      console.warn(`[${algorithm.toUpperCase()}] ⚠️ Área muy pequeña, descartada.`)
      return
    }

    drawBoundingBox(cv, frameMat, transformedCorners.data32F)

    const canvas = document.createElement('canvas')
    cv.imshow(canvas, frameMat)
    resultContainer.innerHTML = ''
    resultContainer.appendChild(canvas)

  } catch (err) {
    console.error(`[${algorithm.toUpperCase()}] Error en la detección:`, err)
  } finally {
    transformedCorners?.delete?.()
    frameMat?.delete?.()
    referenceMat?.delete?.()
    kp1?.delete?.()
    kp2?.delete?.()
    desc1?.delete?.()
    desc2?.delete?.()
  }
}