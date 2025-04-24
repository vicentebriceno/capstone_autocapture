export function getBase64Mat(cv: any, base64: string): Promise<any> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const mat = cv.imread(canvas)
      resolve(mat)
    }
    img.src = base64
  })
}

export async function loadReferenceMat(cv: any): Promise<any> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const mat = cv.imread(canvas)
      resolve(mat)
    }
    img.src = '/images/reference2.jpg'
  })
}

export function polygonArea(points: number[]): number {
  let area = 0
  for (let i = 0; i < 4; i++) {
    const x1 = points[i * 2]
    const y1 = points[i * 2 + 1]
    const x2 = points[((i + 1) % 4) * 2]
    const y2 = points[((i + 1) % 4) * 2 + 1]
    area += (x1 * y2 - x2 * y1)
  }
  return Math.abs(area / 2)
}