
export function readPixel (target, x = 0, y = 0) {
  return canvas.app.renderer.plugins.extract.pixels(target, new PIXI.Rectangle(x, y, 1, 1))
}


export function readAllPixels (target) {
  return canvas.app.renderer.plugins.extract.pixels(target)
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
 * https://gist.github.com/JordanDelcros/518396da1c13f75ee057#gistcomment-2075095
 * args is a list like [[12, 255, 0, 0.5], [36, 19, 183, 0.2]]
 */
export function blendColors (args) {
  let base = [0, 0, 0, 0]
  let mix
  let added
  while (added = args.shift()) {
    if (typeof added[3] === 'undefined') {
      added[3] = 1
    }
    // check if both alpha channels exist.
    if (base[3] && added[3]) {
      mix = [0, 0, 0, 0]
      // alpha
      mix[3] = 1 - (1 - added[3]) * (1 - base[3])
      // red
      mix[0] = Math.round((added[0] * added[3] / mix[3]) + (base[0] * base[3] * (1 - added[3]) / mix[3]))
      // green
      mix[1] = Math.round((added[1] * added[3] / mix[3]) + (base[1] * base[3] * (1 - added[3]) / mix[3]))
      // blue
      mix[2] = Math.round((added[2] * added[3] / mix[3]) + (base[2] * base[3] * (1 - added[3]) / mix[3]))

    } else if (added) {
      mix = added
    } else {
      mix = base
    }
    base = mix
  }

  return mix
}
