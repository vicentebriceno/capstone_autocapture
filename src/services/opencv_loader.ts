export async function loadOpenCV(): Promise<any> {
  // Evitar cargar múltiples veces
  if ((window as any).cv && (window as any).cv.ready) {
    return (window as any).cv
  }

  return new Promise((resolve, reject) => {
    // Cargar el script de OpenCV
    const script = document.createElement('script')
    script.src = '/opencv/opencv_js.js'
    script.async = true

    script.onload = () => {
      console.log('OpenCV.js script cargado.')

      const cvFactory = (globalThis as any).cv
      if (typeof cvFactory === 'function') {

        cvFactory({
          locateFile(path: string) {
            if (path.endsWith('.wasm')) {
              return '/opencv/opencv_js.wasm'
            }
            return '/opencv/' + path
          }
        }).then((cv: any) => {
          console.log('OpenCV.js inicializado desde factory.')
          ;(window as any).cv = cv
          resolve(cv)
        }).catch((err: any) => {
          console.error('Error inicializando OpenCV.js:', err)
          reject(err)
        })
      } else {
        const error = new Error('Factory de OpenCV.js no encontrado.')
        console.error(error)
        reject(error)
      }
    }

    script.onerror = (e) => {
      console.error('Error cargando OpenCV.js:', e)
      reject(e)
    }

    document.body.appendChild(script)
  })
}