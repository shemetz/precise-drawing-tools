import { hookEyedropperColorPicker } from './eyedropper-color-pick.js'

export const MODULE_ID = 'precise-drawing-tools'

let disableGridPrecision = false
let disableDoubleClick = false
let disableDragResistance = false

export function getSetting (settingName) {
  return game.settings.get(MODULE_ID, settingName)
}

const updateActiveToolLimits = () => {
  const activeTool = ui.controls.activeTool
  const nowFreehand = activeTool === 'freehand'
  disableGridPrecision = nowFreehand && getSetting('disable-grid-snapping-while-drawing')
  disableDoubleClick = nowFreehand && getSetting('disable-double-click-while-drawing')
  disableDragResistance = nowFreehand && getSetting('disable-drag-resistance-while-drawing')
}

function _handleMouseDown_Wrapper (wrapped, ...args) {
  const event = args[0]
  if (event.data.originalEvent.button !== 0) return wrapped(...args) // not left-click
  if (!disableDoubleClick) return wrapped(...args) // no need to change anything
  // disabling double-click by setting the "last left-click time" to be more than 250ms in the past
  this.lcTime = -999
  return wrapped(...args)
}

/**
 * ninja-changing this.options.dragResistance if needed
 * @param wrapped
 * @param args
 * @returns {*}
 * @private
 */
function _handleMouseMove_Wrapper (wrapped, ...args) {
  const event = args[0]
  if (!this.state === this.states.DRAG) return wrapped(...args)
  if (this._dragRight) return wrapped(...args) // not left-click move
  if (!disableDragResistance) return wrapped(...args)
  const prevVal = this.options.dragResistance
  this.options.dragResistance = 0.1
  const returned = wrapped(...args)
  this.options.dragResistance = prevVal
  return returned
}

Hooks.once('init', function () {
  game.settings.register(MODULE_ID, 'disable-grid-snapping-while-drawing', {
    name: `Disable grid snapping while drawing`,
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'disable-drag-resistance-while-drawing', {
    name: `Disable drag resistance while drawing`,
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'disable-double-click-while-drawing', {
    name: `Disable double click while drawing`,
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'enable-eyedropper-color-picker', {
    name: `Enable "eyedropper"/"color picker" hotkey`,
    hint: `Pick the color of the current pixel under the cursor, and set it as current stroke color. Hold Shift to change the fill color instead, and hold Alt to pick pixels only from the background image.`,
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
  })
})

/**
 * this is an alternative way to disable snapping to grid;  for now I won't be using it
 */
function gridPrecision_Wrapper (wrapped, ...args) {
  if (disableGridPrecision) {
    return 1000
  } else {
    return wrapped(args)
  }
}

Hooks.once('setup', function () {
  libWrapper.register(
    MODULE_ID,
    'DrawingsLayer.prototype.gridPrecision',
    function (wrapped, ...args) {
      return gridPrecision_Wrapper.bind(this)(wrapped, ...args)
    },
    'MIXED',
  )
  libWrapper.register(
    MODULE_ID,
    'MouseInteractionManager.prototype._handleMouseDown',
    function (wrapped, ...args) {
      return _handleMouseDown_Wrapper.bind(this)(wrapped, ...args)
    },
    'WRAPPER',
  )
  libWrapper.register(
    MODULE_ID,
    'MouseInteractionManager.prototype._handleMouseMove',
    function (wrapped, ...args) {
      return _handleMouseMove_Wrapper.bind(this)(wrapped, ...args)
    },
    'WRAPPER',
  )
  hookEyedropperColorPicker()
  console.log('Done setting up Precise Drawing Tools.')
})

Hooks.once('ready', function () {
  Hooks.on('renderSceneControls', updateActiveToolLimits)
})
