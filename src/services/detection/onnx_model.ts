import * as ort from 'onnxruntime-web'

// Configura entorno ONNX
ort.env.wasm.wasmPaths = "/ort-wasm/"
ort.env.wasm.numThreads = 1

export async function loadModel(path = "/model/best.onnx") {
  console.log("Cargando modelo ONNX...")
  const session = await ort.InferenceSession.create(path)
  const inputName = session.inputNames[0]
  const outputName = session.outputNames[0]
  console.log("Modelo cargado")
  return { session, inputName, outputName }
}

export function preprocessImage(img: HTMLImageElement, targetSize = 640) {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  canvas.width = targetSize
  canvas.height = targetSize

  ctx.drawImage(img, 0, 0, targetSize, targetSize)
  const data = ctx.getImageData(0, 0, targetSize, targetSize).data

  const inputTensor = new Float32Array(3 * targetSize * targetSize)
  let r = 0, g = targetSize * targetSize, b = 2 * targetSize * targetSize
  for (let i = 0; i < data.length; i += 4) {
    inputTensor[r++] = data[i] / 255
    inputTensor[g++] = data[i + 1] / 255
    inputTensor[b++] = data[i + 2] / 255
  }

  const tensor = new ort.Tensor("float32", inputTensor, [1, 3, targetSize, targetSize])
  return { tensor }
}

export async function runInference(
  session: any,
  inputName: string,
  outputName: string,
  image: HTMLImageElement
): Promise<{ output: Float32Array }> {
  const { tensor } = preprocessImage(image)
  const outputs = await session.run({ [inputName]: tensor })
  return { output: outputs[outputName].data as Float32Array }
}

export function parsePredictions(array: Float32Array): number[][] {
  const n = array.length / 6
  const preds: number[][] = []
  for (let i = 0; i < n; i++) {
    preds.push([
      array[i], array[i + n], array[i + n * 2],
      array[i + n * 3], array[i + n * 4], array[i + n * 5]
    ])
  }
  return preds
}

export function getBestPrediction(preds: number[][], threshold = 0.5) {
  let best = null
  let bestConf = 0

  for (const p of preds) {
    const [x, y, w, h, c0, c1] = p
    const conf = Math.max(c0, c1)
    const cls = c1 > c0 ? 1 : 0
    if (conf > threshold && conf > bestConf) {
      bestConf = conf
      best = { x, y, w, h, confidence: conf, classId: cls }
    }
  }

  return best
}

export function drawPrediction(canvas: HTMLCanvasElement, pred: any) {
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (!pred) return

  const squareInputSize = 640
  const targetWidth = 640
  const targetHeight = 480
  const scaleY = targetHeight / squareInputSize
  const scaleX = targetWidth / squareInputSize

  // Reescalamos el bounding box
  const { x, y, w, h, confidence, classId } = pred

  const box = {
    x1: (x - w / 2) * scaleX,
    y1: (y - h / 2) * scaleY,
    x2: (x + w / 2) * scaleX,
    y2: (y + h / 2) * scaleY,
  }

  const visibleZone = {
    x1: 64,
    y1: 80,
    x2: 576,
    y2: 400
  }
  

  const inside =
    box.x1 >= visibleZone.x1 &&
    box.y1 >= visibleZone.y1 &&
    box.x2 <= visibleZone.x2 &&
    box.y2 <= visibleZone.y2

  // Dibujo
  ctx.strokeStyle = inside ? "lime" : "red"
  ctx.lineWidth = 2
  ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1)

  ctx.fillStyle = inside ? "lime" : "red"
  ctx.font = "16px Arial"
  ctx.fillText(`Clase ${classId} ${(confidence * 100).toFixed(1)}%`, box.x1 + 5, box.y1 - 8)

  if (!inside) {
    ctx.fillStyle = "red"
    ctx.font = "bold 18px Arial"
    ctx.fillText("¡Objeto fuera del área clara!", 20, 30)
  }
}
