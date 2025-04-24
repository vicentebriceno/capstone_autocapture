export function shouldKeepMatch({
  inlierCount,
  area,
  minInliers = 10,
  minArea = 80000,
  currentMaxInliers
}: {
  inlierCount: number
  area: number
  minInliers?: number
  minArea?: number
  currentMaxInliers: number
}): boolean {
  if (inlierCount < minInliers) return false
  if (area < minArea) return false
  if (inlierCount <= currentMaxInliers) return false
  return true
}
