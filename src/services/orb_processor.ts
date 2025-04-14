export async function detectKeypointsAndDescriptors(cv: any, image: any) {
  const gray = new cv.Mat()
  cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY)

  const orb = new cv.ORB()
  const keypoints = new cv.KeyPointVector()
  const descriptors = new cv.Mat()

  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors)

  // Liberamos la imagen gris
  gray.delete()

  return { keypoints, descriptors, orb }
}