import { hookEyedropperColorPicker } from './eyedropper-color-pick.js'

export const MODULE_ID = 'precise-drawing-tools'

let disableGridPrecision = false
let disableDoubleClick = false
let disableDragResistance = false
let enableDynamicSamplingRate = false
let desiredMaxDistanceBetweenTwoPoints = 50

export function getSetting (settingName) {
  return game.settings.get(MODULE_ID, settingName)
}

const updateActiveToolLimits = () => {
  const activeTool = ui.controls.activeTool
  const nowFreehand = activeTool === 'freehand'
  disableGridPrecision = nowFreehand && getSetting('disable-grid-snapping-while-drawing')
  disableDoubleClick = nowFreehand && getSetting('disable-double-click-while-drawing')
  disableDragResistance = nowFreehand && getSetting('disable-drag-resistance-while-drawing')
  enableDynamicSamplingRate = nowFreehand && getSetting('enable-dynamic-sampling-rate-while-drawing')
  resetFreehandSamplingRate()
  desiredMaxDistanceBetweenTwoPoints = getSetting('target-sampling-distance')
}

const setFreehandSamplingRate = (newSamplingRateMs) => {
  // default for Drawing.FREEHAND_SAMPLE_RATE is 75.
  // note that it can't be meaningfully lower than _dragThrottleMS
  Drawing.FREEHAND_SAMPLE_RATE = newSamplingRateMs
  // default for _dragThrottleMS is 1000/MaxFPS, so 17 usually.
  const DEFAULT_DRAG_THROTTLE = Math.ceil(1000 / (canvas.app.ticker.maxFPS || 60))
  // note that it can't be meaningfully lower than 8 for common computer mice or 1-2 for modern gaming mice
  canvas.mouseInteractionManager._dragThrottleMS = Math.min(DEFAULT_DRAG_THROTTLE, newSamplingRateMs)
}

const resetFreehandSamplingRate = () => {
  const DEFAULT_FREEHAND_S_R = 75
  const DEFAULT_DRAG_THROTTLE = Math.ceil(1000 / (canvas.app.ticker.maxFPS || 60))
  Drawing.FREEHAND_SAMPLE_RATE = DEFAULT_FREEHAND_S_R
  canvas.mouseInteractionManager._dragThrottleMS = DEFAULT_DRAG_THROTTLE
  lastFewMousePoints.splice(0, lastFewMousePoints.length)
  lastFewMoments.splice(0, lastFewMoments.length)
}

function _handleMouseDown_Wrapper (wrapped, ...args) {
  const event = args[0]
  if (event.data.originalEvent.button !== 0) return wrapped(...args) // not left-click
  if (!disableDoubleClick) return wrapped(...args) // no need to change anything
  // disabling double-click by setting the "last left-click time" to be more than 250ms in the past
  this.lcTime = -999
  return wrapped(...args)
}

function _handleMouseUp_Wrapper (wrapped, ...args) {
  if (enableDynamicSamplingRate) {
    // active tool is no longer freehand;  we should undo our change to sampling rate and throttling
    resetFreehandSamplingRate()
  }
  wrapped(...args)
}

const MAX_FREEHAND_S_R = 75
const MIN_FREEHAND_S_R = 4  // going lower risks probably-too-high polygon counts
const POINTS_SAMPLE_BUFFER_LENGTH = 30
const lastFewMousePoints = []
const lastFewMoments = []

function _handleMouseMove_Wrapper (wrapped, ...args) {
  if (!this.state === this.states.DRAG) return wrapped(...args)
  if (this._dragRight) return wrapped(...args) // not left-click move
  if (enableDynamicSamplingRate) {
    const origEvent = args[0].data.originalEvent
    const timeNowMs = performance.now()  // note - this is rounded to 0.1 ms, and likely stops working with firefox resistFingerprinting
    const halfDragThrottleMs = canvas.mouseInteractionManager._dragThrottleMS / 2
    if (lastFewMoments.length < 2) {
      lastFewMousePoints.push([origEvent.clientX, origEvent.clientY])
      lastFewMoments.push(timeNowMs)
      // temporarily "reset" sampling rate to be very quick for the first 2 points, to avoid visual uglyness
      setFreehandSamplingRate(MIN_FREEHAND_S_R)
    } else if (timeNowMs - lastFewMoments[lastFewMoments.length - 1] >= halfDragThrottleMs) {
      lastFewMousePoints.push([origEvent.clientX, origEvent.clientY])
      lastFewMoments.push(timeNowMs)
    }
    if (lastFewMousePoints.length > 1) {
      if (lastFewMousePoints.length > POINTS_SAMPLE_BUFFER_LENGTH)
        lastFewMousePoints.shift()  // stay at reasonable length
      // idea:  set dynamic sampling rate to be based on "nyquist's theorem", as 2 times the highest frequency of the data.
      // in this case, with varying frequency, I'll set it to be 2 times the frequency needed to get points within some reasonable maximum distance,
      // based on the recent average speed, and bounded.
      const lastFewSpeeds = lastFewMousePoints.map((xy, i) => {
        if (i === 0) return -1
        const deltaX = xy[0] - lastFewMousePoints[i - 1][0]
        const deltaY = xy[1] - lastFewMousePoints[i - 1][1]
        const deltaDistancePx = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2))
        const deltaTimeMs = lastFewMoments[i] - lastFewMoments[i - 1]
        return deltaDistancePx / deltaTimeMs // speed in pixels per millisecond
      }).filter(p => p !== -1)
      const avgRecentSpeed = lastFewSpeeds.reduce(
        (s, sumS) => s + sumS, 0,
      ) / lastFewSpeeds.length
      // we want to ensure avgRecentSpeed leads to 2 points captured per desired max distance
      const satisfyingSamplingRate = desiredMaxDistanceBetweenTwoPoints / avgRecentSpeed / 2
      const newSamplingRate = Math.min(MAX_FREEHAND_S_R, Math.max(MIN_FREEHAND_S_R, satisfyingSamplingRate))
      setFreehandSamplingRate(newSamplingRate)
    }
  }
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
  game.settings.register(MODULE_ID, 'enable-dynamic-sampling-rate-while-drawing', {
    name: `Enable dynamic sampling rate (DSR) while drawing`,
    hint: `Normally, Foundry imposes a sampling rate of 75ms for polygon lines and ~17ms for any mouse drag event.  This setting will dynamically pick a sampling rate of 4-75 depending on how slow you draw with the freehand tool.`,
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'target-sampling-distance', {
    name: `Target sampling distance (if DSR is enabled)`,
    hint: `Defaults to 50, which means it aims to place about two polygon points per 50 screen pixels.  Lower numbers give higher frequency of points`,
    scope: 'client',
    config: true,
    type: Number,
    default: 50,
    onChange: updateActiveToolLimits,
  })
  game.settings.register(MODULE_ID, 'enable-eyedropper-color-picker', {
    name: `Enable "eyedropper"/"color picker" hotkey`,
    hint: `Pick the color of the current pixel under the cursor, and set it as current stroke color. Hold Shift to change the fill color instead.`,
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
    'MouseInteractionManager.prototype._handleMouseUp',
    function (wrapped, ...args) {
      return _handleMouseUp_Wrapper.bind(this)(wrapped, ...args)
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
