export function getGoodMatches(cv: any, desc1: any, desc2: any): any[] {
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false)
  const matches = new cv.DMatchVectorVector()
  matcher.knnMatch(desc1, desc2, matches, 2)

  const goodMatches = []
  for (let i = 0; i < matches.size(); i++) {
    const m = matches.get(i).get(0)
    const n = matches.get(i).get(1)
    if (m.distance < 0.75 * n.distance) {
      goodMatches.push(m)
    }
  }

  matches.delete()
  return goodMatches
}