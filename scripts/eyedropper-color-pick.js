import { getScreenMousePosition } from './mouse-utils.js'
import { readPixel, rgbaToHex } from './canvas-pixi-utils.js'
import { getSetting, MODULE_ID } from './precise-drawing-tools.js'

export const colorPickFromCursor = async (fillOrStroke) => {
  const { color, alpha } = getMousePixelColorAndAlpha()
  await updateDrawingDefaults(
    fillOrStroke === 'fill' ? {
      fillColor: color,
      fillAlpha: alpha,
    } : {
      strokeColor: color,
      strokeAlpha: alpha,
    })
  setDrawingToolGuiColor(color)
}

function getMousePixelColorAndAlpha () {
  const colorWithAlpha = getMousePixel()
  const color = colorWithAlpha.substring(0, 7)
  const alpha = parseInt(colorWithAlpha.substring(7, 9), 16) / 255
  return { color, alpha }
}

function getMousePixel () {
  const { x, y } = getScreenMousePosition()
  const pixelRGBA = readPixel(canvas.primary.renderTexture, x, y)
  // converting alpha from 0—255 to 0—1
  const pixelRGBa = [...pixelRGBA.subarray(0, 3), pixelRGBA[3] / 255]
  let colorWithAlpha = rgbaToHex(...pixelRGBa)
  if (CONFIG.debug.eyedropper) {
    console.log(`%c${colorWithAlpha}    `, `background: ${colorWithAlpha}`)
  }
  return colorWithAlpha
}

async function updateDrawingDefaults (changedData) {
  const currentDefault = game.settings.get('core', DrawingsLayer.DEFAULT_CONFIG_SETTING)
  const newDefault = {
    ...currentDefault,
    ...changedData,
  }
  return game.settings.set('core', DrawingsLayer.DEFAULT_CONFIG_SETTING, newDefault)
}

function setDrawingToolGuiColor (color) {
  const j = $('ol.control-tools > li.scene-control.active')
  if (isFillOrStroke()) {
    j.css('background', color)
  } else {
    j.css('color', color)
  }
}

const isFillOrStroke = () => {
  return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT)
}

function onMouseMoveColorEyedropperTool () {
  const { color } = getMousePixelColorAndAlpha()
  setDrawingToolGuiColor(color)
}

function deactivateEyedropperTool () {
  canvas.stage.off('mousemove', onMouseMoveColorEyedropperTool)
  canvas.stage.off('mousedown', onMouseMoveColorEyedropperTool)
}

function activateColorPickFromCursor () {
  deactivateEyedropperTool()
  // set color in default drawing config.  alt to switch fill/stroke
  const fillOrStroke = isFillOrStroke() ? 'fill' : 'stroke'
  return colorPickFromCursor(fillOrStroke)
}

function startShowingEyedropperColor () {
  // wherever cursor is, that color is set as eyedropper tool background
  canvas.stage.on('mousemove', onMouseMoveColorEyedropperTool)
  canvas.stage.on('mousedown', onMouseMoveColorEyedropperTool)
}

export const hookEyedropperColorPicker = () => {
  const { SHIFT, ALT } = KeyboardManager.MODIFIER_KEYS
  game.keybindings.register(MODULE_ID, 'eyedropper', {
    name: 'Eyedropper (Color Pick)',
    hint: 'Pick the color of the current pixel under the cursor, and set it as current stroke color.' +
      ' Hold Shift to change the fill color instead.',
    editable: [
      {
        key: 'KeyK',
      },
    ],
    reservedModifiers: [SHIFT, ALT],
    onDown: () => {
      if (!getSetting('enable-eyedropper-color-picker')) {
        return false
      }
      if ($(`.scene-control.active`).attr('data-control') === 'drawings') {
        startShowingEyedropperColor()
        onMouseMoveColorEyedropperTool()
        return true // consumed
      } else {
        return false
      }
    },
    onUp: () => {
      if (!getSetting('enable-eyedropper-color-picker')) {
        return false
      }
      if ($(`.scene-control.active`).attr('data-control') === 'drawings') {
        activateColorPickFromCursor()
        return true // consumed
      } else {
        return false
      }
    },
  })
}
