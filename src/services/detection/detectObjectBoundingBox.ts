import { getBase64Mat, loadReferenceDictionary, polygonArea } from '../../utils/image_utils'
import { drawBoundingBox } from '../shared/draw'
import { getGoodMatches } from '../shared/matching'
import { computeTransformedCorners } from '../shared/homography'
import { detectKeypointsAndDescriptors } from './detectKeypointsAndDescriptors'
import { shouldKeepMatch } from '../shared/matchFilters'

export async function detectObjectBoundingBox(
  cv: any,
  frameBase64: string,
  resultContainer: HTMLDivElement,
  algorithm: 'orb' | 'brisk' | 'akaze'
) {
  let frameMat, kp1, desc1
  let bestMatch = null
  let referenceDictionary: any[] = []  

  try {
    frameMat = await getBase64Mat(cv, frameBase64)

    const imagePaths = [
      "/images/reference1.png",
      /* "/images/reference2.jpg",
      "/images/reference3.jpg",
      "/images/reference4.jpg" */
    ]

    referenceDictionary = await loadReferenceDictionary(cv, imagePaths, algorithm)
    const result1 = await detectKeypointsAndDescriptors(cv, frameMat, algorithm)
    kp1 = result1.keypoints
    desc1 = result1.descriptors

    let maxInliers = 0

    for (const ref of referenceDictionary) {
      const goodMatches = getGoodMatches(cv, desc1, ref.descriptors)
      if (goodMatches.length < 10) continue

      const transformed = computeTransformedCorners(cv, goodMatches, kp1, ref.keypoints, {
        width: ref.mat.cols,
        height: ref.mat.rows
      })

      const area = polygonArea(transformed.data32F)

      // Pero si necesitas contar inliers, también puedes adaptarlo para retornarlo
      const inlierCount = goodMatches.length // simplificado, o usar máscara si se adapta la función

      if (shouldKeepMatch({
        inlierCount,
        area,
        currentMaxInliers: maxInliers
      })) {
        bestMatch?.transformedCorners?.delete?.()
        bestMatch = {
          transformedCorners: transformed
        }
        maxInliers = inlierCount
      } else {
        transformed.delete()
      }
    }

    if (!bestMatch) return

    drawBoundingBox(cv, frameMat, bestMatch.transformedCorners.data32F)

    const canvas = document.createElement('canvas')
    cv.imshow(canvas, frameMat)
    resultContainer.innerHTML = ''
    resultContainer.appendChild(canvas)

  } catch (err) {
    console.error(`[${algorithm.toUpperCase()}] Error en la detección:`, err)
  } finally {
    for (const ref of referenceDictionary ?? []) {
      ref.mat?.delete?.()
      ref.keypoints?.delete?.()
      ref.descriptors?.delete?.()
    }    
  }
}