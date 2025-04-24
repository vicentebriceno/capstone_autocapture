import { createDetector } from './detectors'

export async function detectKeypointsAndDescriptors(
  cv: any,
  image: any,
  type: 'orb' | 'brisk' | 'akaze'
): Promise<{ keypoints: any; descriptors: any }> {
  const gray = new cv.Mat()
  cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY)
  cv.equalizeHist(gray, gray)
  cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0)

  const detector = createDetector(cv, type)

  const keypoints = new cv.KeyPointVector()
  const descriptors = new cv.Mat()
  detector.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors)

  gray.delete()
  detector.delete()

  return { keypoints, descriptors }
}
