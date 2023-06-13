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