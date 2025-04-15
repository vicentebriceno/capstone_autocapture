export async function detectKeypointsAndDescriptors(cv: any, image: any) {
  const gray = new cv.Mat()
  cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY)

  //  Mejora contraste e iluminación
  cv.equalizeHist(gray, gray)

  //  Suavizado leve para mejorar detección
  cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0)

  //  Aumentar cantidad y calidad de keypoints
  const orb = new cv.ORB(1000, 1.2, 5, 31, 0, 2, cv.ORB_HARRIS_SCORE, 31, 10)

  const keypoints = new cv.KeyPointVector()
  const descriptors = new cv.Mat()

  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors)

  gray.delete()

  return { keypoints, descriptors, orb }
}
