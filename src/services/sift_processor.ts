export function detectKeypointsAndDescriptors(cv: any, image: any) {
  const gray = new cv.Mat()
  cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY)

  const sift = new cv.SIFT()
  const keypoints = new cv.KeyPointVector()
  const descriptors = new cv.Mat()

  sift.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors)

  gray.delete()

  return { keypoints, descriptors, sift }
}
