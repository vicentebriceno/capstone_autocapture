export function computeTransformedCorners(
  cv: any,
  goodMatches: any[],
  kp1: any,
  kp2: any,
  refSize: { width: number; height: number }
) {
  const srcPoints: number[] = []
  const dstPoints: number[] = []

  for (const match of goodMatches) {
    const pt1 = kp1.get(match.queryIdx).pt
    const pt2 = kp2.get(match.trainIdx).pt
    srcPoints.push(pt1.x, pt1.y)
    dstPoints.push(pt2.x, pt2.y)
  }

  const srcMat = cv.matFromArray(goodMatches.length, 1, cv.CV_32FC2, srcPoints)
  const dstMat = cv.matFromArray(goodMatches.length, 1, cv.CV_32FC2, dstPoints)

  const mask = new cv.Mat()
  const H = cv.findHomography(srcMat, dstMat, cv.RANSAC, 5.0, mask)

  const refCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0, 0, refSize.height, refSize.width, refSize.height, refSize.width, 0
  ])
  const transformedCorners = new cv.Mat()

  const H_inv = new cv.Mat()
  cv.invert(H, H_inv)
  cv.perspectiveTransform(refCorners, transformedCorners, H_inv)

  ;[srcMat, dstMat, mask, H, refCorners, H_inv].forEach(m => m.delete?.())

  return transformedCorners
}