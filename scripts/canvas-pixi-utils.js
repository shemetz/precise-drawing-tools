export function readPixel (target, x = 0, y = 0) {
  return canvas.app.renderer.extract.pixels(target, new PIXI.Rectangle(x, y, 1, 1))
}

/**
 * https://stackoverflow.com/a/49974627/1703463
 * expects RGB in 0—255 and a in 0—1
 */
export function rgbaToHex (r, g, b, a) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    + '' + (a ? ((1 << 8) + Math.round(a * 255)).toString(16).slice(1)
      : '')
}

/**
 * Convert selected drawings to a webp image
 */
export const convertDrawingsToImage = async (drawings, quality) => {
  // Calculate bounds of drawing objects
  const left = drawings.reduce((min, drawing) => Math.min(min, drawing.x), Infinity)
  const top = drawings.reduce((min, drawing) => Math.min(min, drawing.y), Infinity)
  const right = drawings.reduce((max, drawing) => Math.max(max, drawing.x + drawing.shape.width), -Infinity)
  const bottom = drawings.reduce((max, drawing) => Math.max(max, drawing.y + drawing.shape.height), -Infinity)
  const width = right - left
  const height = bottom - top

  const container = new PIXI.Container({ width, height })

  // Copy all drawings into a PIXI Container
  for (const drawing of drawings) {
    const newShape = drawing.shape.clone()
    // Set position within the container
    newShape.position.set(drawing.x - left, drawing.y - top)
    // Add the shape to the container
    container.addChild(newShape)
    // Text drawings have an additional part, not just the shape (border) but also the text itself
    if (drawing.hasText) {
      const textShape = new PreciseText(drawing.document.text || '', drawing._getTextStyle())
      textShape.eventMode = 'none'
      // Set position within the container, needs to be center-aligned
      textShape.position.set(drawing.x - left + drawing.text.x, drawing.y - top + drawing.text.y)
      textShape.anchor.set(0.5, 0.5)
      // Add the shape to the container
      container.addChild(textShape)
    }
  }
  const blob = await getContainerBlob(container, quality)

  // Clean up
  container.destroy({ children: true })

  return {
    blob,
    left,
    top,
    width,
    height,
  }
}
const getContainerBlob = async (container, quality) => {
  const img = await canvas.app.renderer.extract.image(container, 'image/webp', quality)
  const response = await fetch(img.src)
  return response.blob()
}