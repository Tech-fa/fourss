import type { Diagram } from './diagram-model'

export type DiagramImage = {
  src: string
  width: number
  height: number
  alt: string
  diagram: Diagram
}

export function svgToPng(svg: string, width: number, height: number) {
  const scale = 2
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(width * scale))
        canvas.height = Math.max(1, Math.round(height * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Could not draw the diagram')
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => {
      reject(new Error('Could not draw the diagram'))
    }
    image.src = url
  })
}
