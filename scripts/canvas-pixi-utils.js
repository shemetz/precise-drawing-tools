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

const minimumOfAll = (arr) => arr.reduce((min, val) => Math.min(min, val), Infinity)
const maximumOfAll = (arr) => arr.reduce((max, val) => Math.max(max, val), -Infinity)

const WORKAROUND = true

/**
 * Convert selected drawings to a webp image.
 *
 * The colors get messed up if the line color is half-transparent and any r/g/b value is 255.
 * Worked-around by adding an initial pass to desaturate these colors to 254, then reverting after.
 *
 * FIXME: rotated drawings are slightly cropped in edge cases
 */
export const convertDrawingsToImage = async (drawings, quality) => {
  // Calculate bounds of drawing objects
  const left = minimumOfAll(drawings.map(d => d.shape.canvasBounds.x))
  const top = minimumOfAll(drawings.map(d => d.shape.canvasBounds.y))
  const right = maximumOfAll(drawings.map(d => d.shape.canvasBounds.x + d.shape.canvasBounds.width))
  const bottom = maximumOfAll(drawings.map(d => d.shape.canvasBounds.y + d.shape.canvasBounds.height))
  const width = right - left
  const height = bottom - top

  const container = new PIXI.Container({ width, height })

  const workaroundUpdates = []
  const workaroundReverseUpdates = []
  if (WORKAROUND) {
    // workaround for bad colors bugs
    // desaturate all colors that are both maximally saturated in r/g/b and are partially transparent
    // these color impurities will be undone after the image is rendered
    for (const drawing of drawings) {
      const { strokeColor, strokeAlpha, fillColor, fillAlpha, textColor, textAlpha } = drawing.document
      if (
        (strokeAlpha > 0 && strokeAlpha < 1 && strokeColor.rgb.includes(1))
        || (fillAlpha > 0 && fillAlpha < 1 && fillColor.rgb.includes(1))
        || (textAlpha > 0 && textAlpha < 1 && textColor.rgb.includes(1))
      ) {
        workaroundUpdates.push({
          _id: drawing.id,
          strokeColor: Color.fromRGB(strokeColor.rgb.map((c, i) => c === 1 ? 0.999 : c)), // 0.999 -> 254 (not 255)
          fillColor: Color.fromRGB(fillColor.rgb.map((c, i) => c === 1 ? 0.999 : c)),
          textColor: Color.fromRGB(textColor.rgb.map((c, i) => c === 1 ? 0.999 : c)),
        })
        workaroundReverseUpdates.push({
          _id: drawing.id,
          strokeColor,
          fillColor,
          textColor,
        })
      }
      await canvas.scene.updateEmbeddedDocuments('Drawing', workaroundUpdates)
      // sleep and rerender for 1 frame
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  // Copy all drawings into a PIXI Container
  for (const drawing of drawings) {
    const newShape = drawing.shape.clone()
    // Set position within the container
    newShape.transform = drawing.shape.transform
    // Add the shape to the container
    container.addChild(newShape)
    // Text drawings have an additional part, not just the shape (border) but also the text itself
    if (drawing.hasText) {
      const textShape = new PreciseText(drawing.document.text || '', drawing._getTextStyle())
      textShape.eventMode = 'none'
      // Set position within the container, needs to be center-aligned
      textShape.position.set(drawing.x - left + drawing.text.x, drawing.y - top + drawing.text.y)
      textShape.rotation = drawing.shape.rotation
      textShape.anchor.set(0.5, 0.5)
      // Add the shape to the container
      container.addChild(textShape)
    }
  }
  const blob = await getContainerBlob(container, quality)

  // Clean up
  container.destroy({ children: true })
  await canvas.scene.updateEmbeddedDocuments('Drawing', workaroundReverseUpdates)

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