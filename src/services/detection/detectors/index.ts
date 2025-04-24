import { createOrb } from './createORB'
import { createBrisk } from './createBRISK'
import { createAkaze } from './createAKAZE'

export function createDetector(cv: any, type: 'orb' | 'brisk' | 'akaze'): any {
  switch (type) {
    case 'orb':
      return createOrb(cv)
    case 'brisk':
      return createBrisk(cv)
    case 'akaze':
      return createAkaze(cv)
    default:
      throw new Error(`Tipo de detector desconocido: ${type}`)
  }
}
