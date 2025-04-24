export function createOrb(cv: any): any {
  return new cv.ORB(
    1000,        // nfeatures
    1.2,         // scaleFactor
    5,           // nlevels
    31,          // edgeThreshold
    0,           // firstLevel
    2,           // WTA_K
    cv.ORB_HARRIS_SCORE, // scoreType
    31,          // patchSize
    10           // fastThreshold
  )
}
