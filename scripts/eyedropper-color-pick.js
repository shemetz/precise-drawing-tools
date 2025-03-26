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

/**
 TIP:

 It's easy to test this with a short code snippet that:
 1. dumps the canvas texture into a base64 string
 2. opens a new tab with this base64 string as the source of a new image

 Behold:

 ```js
 let dump = await canvas.app.renderer.extract.base64(canvas.primary.renderTexture)
 window.open().document.write("<img src='" + dump + "'/>")
 ```

 The result image is good because:
 - it includes the background
 - it includes tokens and tiles (even on higher altitudes)
 - it includes object drawings
 - it ignores lighting
 - it ignores UI elements

 But:
 - it includes weather effects
 - it includes scene darkness  TODO - get color pick to better ignore scene darkness! (workaround for now is to disable temporarily)

 Compare this to a worse alternative by replacing canvas.primary.renderTexture with canvas.stage or canvas.environment.

 Also compare:
 - canvas.effects.illumination.renderTexture
 - canvas.primary.background
 */
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
  /**
   * override this css bit:
   *
   * .ui-control[aria-pressed=true] {
   *     --control-bg-color: var(--control-active-bg-color);
   *     --control-border-color: var(--control-active-border-color);
   *     --control-icon-color: var(--control-active-icon-color);
   * }
   *
   * .ui-control {
   * ...
   *     background: var(--control-bg-color);
   *     border: 1px solid var(--control-border-color);
   *     color: var(--control-icon-color);
   * ...
   * }
   */
  const j = $('#scene-controls-tools > li > button.tool.ui-control[aria-pressed="true"]')
  if (isFillOrStroke()) {
    j.css('background', color)
  } else {
    j.css('color', color)
    j.css('border', `2px solid ${color}`)
  }
}

const isFillOrStroke = () => {
  return game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT)
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
  // set color in default drawing config.  shift to switch fill/stroke
  const fillOrStroke = isFillOrStroke() ? 'fill' : 'stroke'
  return colorPickFromCursor(fillOrStroke)
}

function startShowingEyedropperColor () {
  // wherever cursor is, that color is set as eyedropper tool background
  canvas.stage.on('mousemove', onMouseMoveColorEyedropperTool)
  canvas.stage.on('mousedown', onMouseMoveColorEyedropperTool)
}

let prevDarknessLevel = undefined

function temporarilyChangeUiDuringColorPicking () {
  prevDarknessLevel = canvas.darknessLevel
  canvas.environment.initialize({ environment: { darknessLevel: 0 } })
  canvas.weather.weatherEffects.visible = false
  $('#scene-controls')[0].classList.remove('faded-ui')
}

function undoTemporaryUiChanges () {
  canvas.environment.initialize({ environment: { darknessLevel: prevDarknessLevel } })
  canvas.weather.weatherEffects.visible = true
  $('#scene-controls')[0].classList.add('faded-ui')
}

export const hookEyedropperColorPicker = () => {
  const { SHIFT } = foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS
  game.keybindings.register(MODULE_ID, 'eyedropper', {
    name: 'Eyedropper (Color Pick)',
    hint: 'Pick the color of the current pixel under the cursor, and set it as current stroke color.' +
      ' Hold Shift to change the fill color instead.',
    editable: [
      {
        key: 'KeyK',
      },
    ],
    reservedModifiers: [SHIFT],
    onDown: () => {
      if (!getSetting('enable-eyedropper-color-picker')) {
        return false
      }
      if (ui.controls.control.name === 'drawings') {
        startShowingEyedropperColor()
        onMouseMoveColorEyedropperTool()
        temporarilyChangeUiDuringColorPicking()
        return true // consumed
      } else {
        return false
      }
    },
    onUp: () => {
      if (!getSetting('enable-eyedropper-color-picker')) {
        return false
      }
      if (ui.controls.control.name === 'drawings') {
        activateColorPickFromCursor()
        undoTemporaryUiChanges()
        return true // consumed
      } else {
        return false
      }
    },
  })
}
