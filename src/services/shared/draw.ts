export function drawBoundingBox(cv: any, mat: any, points: Float32Array) {
  for (let i = 0; i < 4; i++) {
    const x1 = points[i * 2]
    const y1 = points[i * 2 + 1]
    const x2 = points[((i + 1) % 4) * 2]
    const y2 = points[((i + 1) % 4) * 2 + 1]
    cv.line(mat, new cv.Point(x1, y1), new cv.Point(x2, y2), [0, 255, 0, 255], 3)
  }
}